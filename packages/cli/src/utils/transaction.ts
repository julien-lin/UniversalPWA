import { existsSync, readFileSync, writeFileSync, rmSync, statSync, readdirSync, rmdirSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import chalk from 'chalk'

export interface FileBackup {
  path: string
  originalContent?: Buffer
  originalExists: boolean
  timestamp: number
}

export interface TransactionState {
  id: string
  backups: FileBackup[]
  createdFiles: string[]
  createdDirs: string[]
  timestamp: number
}

export interface TransactionOptions {
  projectPath: string
  outputDir?: string
  verbose?: boolean
}

/**
 * Système de transaction pour gérer les rollbacks
 */
export class Transaction {
  private state: TransactionState
  private options: TransactionOptions
  private isCommitted = false
  private isRolledBack = false

  constructor(options: TransactionOptions) {
    this.options = options
    this.state = {
      id: createHash('md5').update(`${Date.now()}-${Math.random()}`).digest('hex').substring(0, 8),
      backups: [],
      createdFiles: [],
      createdDirs: [],
      timestamp: Date.now(),
    }

    if (this.options.verbose) {
      console.log(chalk.gray(`📦 Transaction ${this.state.id} started`))
    }
  }

  /**
   * Sauvegarde l'état d'un fichier avant modification
   */
  backupFile(filePath: string): void {
    if (this.isCommitted || this.isRolledBack) {
      throw new Error('Transaction is already committed or rolled back')
    }

    const fullPath = join(this.options.projectPath, this.options.outputDir || '', filePath)
    const backup: FileBackup = {
      path: fullPath,
      originalExists: existsSync(fullPath),
      timestamp: Date.now(),
    }

    if (backup.originalExists) {
      try {
        backup.originalContent = readFileSync(fullPath)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (this.options.verbose) {
          console.log(chalk.yellow(`⚠ Warning: Could not backup ${filePath}: ${errorMessage}`))
        }
      }
    }

    this.state.backups.push(backup)

    if (this.options.verbose) {
      console.log(chalk.gray(`  📋 Backed up: ${filePath}`))
    }
  }

  /**
   * Marque un fichier comme créé par cette transaction
   */
  trackCreatedFile(filePath: string): void {
    if (this.isCommitted || this.isRolledBack) {
      throw new Error('Transaction is already committed or rolled back')
    }

    const fullPath = join(this.options.projectPath, this.options.outputDir || '', filePath)
    if (!this.state.createdFiles.includes(fullPath)) {
      this.state.createdFiles.push(fullPath)
    }

    if (this.options.verbose) {
      console.log(chalk.gray(`  ➕ Tracked created file: ${filePath}`))
    }
  }

  /**
   * Marque un répertoire comme créé par cette transaction
   */
  trackCreatedDir(dirPath: string): void {
    if (this.isCommitted || this.isRolledBack) {
      throw new Error('Transaction is already committed or rolled back')
    }

    const fullPath = join(this.options.projectPath, this.options.outputDir || '', dirPath)
    if (!this.state.createdDirs.includes(fullPath)) {
      this.state.createdDirs.push(fullPath)
    }

    if (this.options.verbose) {
      console.log(chalk.gray(`  📁 Tracked created dir: ${dirPath}`))
    }
  }

  /**
   * Restaure tous les fichiers sauvegardés
   */
  private restoreBackups(): void {
    for (const backup of this.state.backups) {
      try {
        if (backup.originalExists && backup.originalContent) {
          // Restaurer le contenu original
          writeFileSync(backup.path, backup.originalContent)
          if (this.options.verbose) {
            console.log(chalk.gray(`  ↺ Restored: ${backup.path}`))
          }
        } else if (!backup.originalExists && existsSync(backup.path)) {
          // Supprimer le fichier créé
          rmSync(backup.path, { force: true })
          if (this.options.verbose) {
            console.log(chalk.gray(`  🗑️  Removed: ${backup.path}`))
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.log(chalk.yellow(`⚠ Warning: Could not restore ${backup.path}: ${errorMessage}`))
      }
    }
  }

  /**
   * Supprime tous les fichiers créés par cette transaction
   */
  private removeCreatedFiles(): void {
    for (const filePath of this.state.createdFiles) {
      try {
        if (existsSync(filePath)) {
          rmSync(filePath, { force: true })
          if (this.options.verbose) {
            console.log(chalk.gray(`  🗑️  Removed created file: ${filePath}`))
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.log(chalk.yellow(`⚠ Warning: Could not remove ${filePath}: ${errorMessage}`))
      }
    }
  }

  /**
   * Supprime tous les répertoires créés par cette transaction (si vides)
   */
  private removeCreatedDirs(): void {
    // Supprimer dans l'ordre inverse (répertoires les plus profonds en premier)
    const sortedDirs = [...this.state.createdDirs].sort((a, b) => b.length - a.length)

    for (const dirPath of sortedDirs) {
      try {
        if (existsSync(dirPath)) {
          // Vérifier si le répertoire est vide
          try {
            const stats = statSync(dirPath)
            if (stats.isDirectory()) {
              // Vérifier si le répertoire est vraiment vide
              const entries = readdirSync(dirPath)
              if (entries.length === 0) {
                // Répertoire vide, on peut le supprimer
                try {
                  rmdirSync(dirPath)
                  if (this.options.verbose) {
                    console.log(chalk.gray(`  🗑️  Removed created dir: ${dirPath}`))
                  }
                } catch {
                  // Ignore errors (peut être déjà supprimé ou permissions)
                }
              } else {
                // Répertoire non vide, on le laisse
                if (this.options.verbose) {
                  console.log(chalk.gray(`  ⚠ Skipped non-empty dir: ${dirPath}`))
                }
              }
            }
          } catch {
            // Ignore errors
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.log(chalk.yellow(`⚠ Warning: Could not remove ${dirPath}: ${errorMessage}`))
      }
    }
  }

  /**
   * Effectue un rollback complet
   */
  rollback(): void {
    if (this.isCommitted) {
      throw new Error('Cannot rollback a committed transaction')
    }

    if (this.isRolledBack) {
      return // Déjà rollback
    }

    if (this.options.verbose) {
      console.log(chalk.yellow(`\n🔄 Rolling back transaction ${this.state.id}...`))
    }

    this.isRolledBack = true

    // 1. Supprimer les fichiers créés
    this.removeCreatedFiles()

    // 2. Supprimer les répertoires créés (si vides)
    this.removeCreatedDirs()

    // 3. Restaurer les fichiers sauvegardés
    this.restoreBackups()

    if (this.options.verbose) {
      console.log(chalk.yellow(`✓ Rollback completed for transaction ${this.state.id}`))
    }
  }

  /**
   * Valide la transaction (pas de rollback possible après)
   */
  commit(): void {
    if (this.isRolledBack) {
      throw new Error('Cannot commit a rolled back transaction')
    }

    if (this.isCommitted) {
      return // Déjà commité
    }

    this.isCommitted = true

    if (this.options.verbose) {
      console.log(chalk.green(`✓ Transaction ${this.state.id} committed`))
    }
  }

  /**
   * Retourne l'état de la transaction
   */
  getState(): Readonly<TransactionState> {
    return { ...this.state }
  }

  /**
   * Vérifie si la transaction est commitée
   */
  isCommittedState(): boolean {
    return this.isCommitted
  }

  /**
   * Vérifie si la transaction a été rollback
   */
  isRolledBackState(): boolean {
    return this.isRolledBack
  }
}

