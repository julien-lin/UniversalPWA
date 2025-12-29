import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { Transaction, type TransactionOptions } from './transaction.js'

const TEST_DIR = join(process.cwd(), '.test-tmp-transaction')

// Helpers pour réduire la duplication dans les tests
function resolvePath(filename: string): string {
  return join(TEST_DIR, filename)
}

export function createTestFile(filename: string, content: string): string {
  const full = resolvePath(filename)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content)
  return full
}

export function createTransaction(options?: Partial<TransactionOptions>): Transaction {
  return new Transaction({ projectPath: TEST_DIR, verbose: false, ...options })
}

export function expectBackup(t: Transaction, filename: string, exists: boolean): void {
  const state = t.getState()
  const entry = state.backups.find((b) => b.path.endsWith(`/${filename}`) || b.path.endsWith(`\\${filename}`))
  expect(entry).toBeDefined()
  expect(entry?.originalExists).toBe(exists)
}

export function expectFileRestored(filename: string, expectedContent: string): void {
  expect(readFileSync(resolvePath(filename), 'utf-8')).toBe(expectedContent)
}

function createTestDir(dir: string): string {
  const full = resolvePath(dir)
  mkdirSync(full, { recursive: true })
  return full
}

describe('Transaction', () => {
  beforeEach(() => {
    try {
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true })
      }
    } catch {
      // Ignore errors during cleanup
    }
    mkdirSync(TEST_DIR, { recursive: true })
  })

  it('should create a transaction with unique ID', () => {
    const transaction = createTransaction()

    expect(transaction.getState().id).toBeDefined()
    expect(transaction.getState().id.length).toBe(8)
  })

  it('should backup existing file', () => {
    const originalContent = 'original content'
    createTestFile('test.txt', originalContent)

    const transaction = createTransaction()

    transaction.backupFile('test.txt')

    expectBackup(transaction, 'test.txt', true)
    expect(transaction.getState().backups[0].originalContent?.toString()).toBe(originalContent)
  })

  it('should log warning when backup read fails', () => {
    createTestFile('test.txt', 'content')

    const transaction = createTransaction({ verbose: true })

    const fs = require('fs')
    const readSpy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('read fail')
    })
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

    expect(() => transaction.backupFile('test.txt')).not.toThrow()
    expect(consoleSpy).toHaveBeenCalled()

    readSpy.mockRestore()
    consoleSpy.mockRestore()
  })

  it('should track created file', () => {
    const transaction = createTransaction({ outputDir: 'output' })

    transaction.trackCreatedFile('new-file.txt')

    const state = transaction.getState()
    expect(state.createdFiles.length).toBe(1)
    expect(state.createdFiles[0]).toContain('new-file.txt')
  })

  it('should track created directory', () => {
    const transaction = createTransaction({ outputDir: 'output' })

    transaction.trackCreatedDir('new-dir')

    const state = transaction.getState()
    expect(state.createdDirs.length).toBe(1)
  })

  it('should restore file on rollback', () => {
    const originalContent = 'original content'
    createTestFile('test.txt', originalContent)

    const transaction = createTransaction()

    transaction.backupFile('test.txt')

    // Modify file
    createTestFile('test.txt', 'modified content')

    // Rollback
    transaction.rollback()

    // File should be restored
    expectFileRestored('test.txt', originalContent)
    expect(transaction.isRolledBackState()).toBe(true)
  })

  it('should remove created file on rollback', () => {
    createTestFile('new-file.txt', 'new content')

    const transaction = createTransaction()

    transaction.trackCreatedFile('new-file.txt')

    // Rollback
    transaction.rollback()

    // File should be removed
    expect(existsSync(resolvePath('new-file.txt'))).toBe(false)
  })

  it('should remove created directory on rollback if empty', () => {
    createTestDir('new-dir')

    const transaction = createTransaction()

    transaction.trackCreatedDir('new-dir')

    // Rollback
    transaction.rollback()

    // Directory should be removed if empty
    expect(existsSync(resolvePath('new-dir'))).toBe(false)
  })

  it('should not remove non-empty directory on rollback', () => {
    createTestDir('new-dir')
    createTestFile('new-dir/file.txt', 'content')

    const transaction = createTransaction()

    transaction.trackCreatedDir('new-dir')

    // Rollback
    transaction.rollback()

    // Directory should still exist (not empty)
    expect(existsSync(resolvePath('new-dir'))).toBe(true)
  })

  it('should commit transaction', () => {
    const transaction = createTransaction()

    transaction.commit()

    expect(transaction.isCommittedState()).toBe(true)
    expect(transaction.isRolledBackState()).toBe(false)
  })

  it('should return early if already committed', () => {
    const transaction = createTransaction()

    // First commit
    transaction.commit()
    expect(transaction.isCommittedState()).toBe(true)

    // Second commit should return early (line 250-251)
    expect(() => transaction.commit()).not.toThrow()
    expect(transaction.isCommittedState()).toBe(true)
  })

  it('should not allow rollback after commit', () => {
    const transaction = createTransaction()

    transaction.commit()

    expect(() => transaction.rollback()).toThrow('Cannot rollback a committed transaction')
  })

  it('should return early if already rolled back', () => {
    const transaction = createTransaction()

    // First rollback
    transaction.rollback()
    expect(transaction.isRolledBackState()).toBe(true)

    // Second rollback should return early (line 218-219)
    expect(() => transaction.rollback()).not.toThrow()
    expect(transaction.isRolledBackState()).toBe(true)
  })

  it('should not allow commit after rollback', () => {
    const transaction = createTransaction()

    transaction.rollback()

    expect(() => transaction.commit()).toThrow('Cannot commit a rolled back transaction')
  })

  it('should handle backup of non-existent file', () => {
    const transaction = new Transaction({
      projectPath: TEST_DIR,
      verbose: false,
    })

    transaction.backupFile('non-existent.txt')

    const state = transaction.getState()
    expect(state.backups.length).toBe(1)
    expect(state.backups[0].originalExists).toBe(false)
  })

  it('should restore non-existent file by removing it on rollback', () => {
    // File doesn't exist initially

    const transaction = createTransaction()

    // Backup non-existent file (will mark as not existing)
    transaction.backupFile('new-file.txt')

    // Now create the file (simulating it was created during transaction)
    createTestFile('new-file.txt', 'new content')

    // Rollback should remove the file (restore to non-existent state)
    transaction.rollback()

    expect(existsSync(resolvePath('new-file.txt'))).toBe(false)
  })

  it('should handle multiple backups and created files', () => {
    createTestFile('file1.txt', 'content1')
    createTestFile('file2.txt', 'content2')

    const transaction = createTransaction()

    transaction.backupFile('file1.txt')
    transaction.backupFile('file2.txt')
    transaction.trackCreatedFile('new-file.txt')

    const state = transaction.getState()
    expect(state.backups.length).toBe(2)
    expect(state.createdFiles.length).toBe(1)
  })

  describe('removeCreatedFiles - error handling and verbose logging', () => {
    it('should handle errors when removing created files', () => {
      createTestFile('new-file.txt', 'content')

      const transaction = createTransaction({ verbose: true })

      transaction.trackCreatedFile('new-file.txt')

      // Mock rmSync to throw error
      const fs = require('fs')
      const rmSyncSpy = vi.spyOn(fs, 'rmSync').mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

      transaction.rollback()

      // Should log warning about error
      expect(consoleSpy).toHaveBeenCalled()
      expect(transaction.isRolledBackState()).toBe(true)

      rmSyncSpy.mockRestore()
      consoleSpy.mockRestore()
    })

    it('should log verbose message when removing created file', () => {
      createTestFile('new-file.txt', 'content')

      const transaction = createTransaction({ verbose: true })

      transaction.trackCreatedFile('new-file.txt')

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

      transaction.rollback()

      // Should log verbose message about removing file
      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleSpy.mock.calls.some((call) => call[0]?.includes('Removed created file'))).toBe(true)

      consoleSpy.mockRestore()
    })

    it('should skip file removal if file does not exist', () => {
      const transaction = createTransaction()

      // Track a file that doesn't exist
      transaction.trackCreatedFile('non-existent-file.txt')

      // Rollback should not throw error
      expect(() => transaction.rollback()).not.toThrow()
      expect(transaction.isRolledBackState()).toBe(true)
    })

    it('should log warning if existsSync throws during file removal', () => {
      const transaction = createTransaction({ verbose: true })

      transaction.trackCreatedFile('will-throw.txt')

      const fs = require('fs')
      const existsSyncSpy = vi.spyOn(fs, 'existsSync').mockImplementation(() => {
        throw new Error('Unexpected existsSync error')
      })
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

      expect(() => transaction.rollback()).not.toThrow()
      expect(consoleSpy).toHaveBeenCalled()
      expect(transaction.isRolledBackState()).toBe(true)

      existsSyncSpy.mockRestore()
      consoleSpy.mockRestore()
    })
  })

  describe('restoreBackups - error handling', () => {
    it('should log warning when restore write fails', () => {
      createTestFile('test.txt', 'original')

      const transaction = createTransaction({ verbose: true })

      transaction.backupFile('test.txt')
      createTestFile('test.txt', 'modified')

      const fs = require('fs')
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('write fail')
      })
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

      expect(() => transaction.rollback()).not.toThrow()
      expect(consoleSpy).toHaveBeenCalled()
      expect(transaction.isRolledBackState()).toBe(true)

      writeSpy.mockRestore()
      consoleSpy.mockRestore()
    })
  })

  describe('removeCreatedDirs - error handling and verbose logging', () => {
    it('should handle errors when removing created directories', () => {
      createTestDir('new-dir')

      const transaction = createTransaction({ verbose: true })

      transaction.trackCreatedDir('new-dir')

      // Mock readdirSync to throw error
      const fs = require('fs')
      const readdirSyncSpy = vi.spyOn(fs, 'readdirSync').mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

      transaction.rollback()

      // Should handle error gracefully
      expect(transaction.isRolledBackState()).toBe(true)

      readdirSyncSpy.mockRestore()
      consoleSpy.mockRestore()
    })

    it('should log verbose message when removing empty directory', () => {
      createTestDir('empty-dir')

      const transaction = createTransaction({ verbose: true })

      transaction.trackCreatedDir('empty-dir')

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

      transaction.rollback()

      // Should log verbose message about removing directory
      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleSpy.mock.calls.some((call) => call[0]?.includes('Removed created dir'))).toBe(true)

      consoleSpy.mockRestore()
    })

    it('should log verbose message when skipping non-empty directory', () => {
      createTestDir('non-empty-dir')
      createTestFile('non-empty-dir/file.txt', 'content')

      const transaction = createTransaction({ verbose: true })

      transaction.trackCreatedDir('non-empty-dir')

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

      transaction.rollback()

      // Should log verbose message about skipping non-empty directory
      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleSpy.mock.calls.some((call) => call[0]?.includes('Skipped non-empty dir'))).toBe(true)

      consoleSpy.mockRestore()
    })

    it('should handle directory that is not a directory (file instead)', () => {
      createTestFile('file-as-dir', 'content')

      const transaction = createTransaction()

      // Track a file as if it were a directory (edge case)
      transaction.trackCreatedDir('file-as-dir')

      // Rollback should handle this gracefully
      expect(() => transaction.rollback()).not.toThrow()
      expect(transaction.isRolledBackState()).toBe(true)
    })

    it('should handle statSync errors gracefully', () => {
      createTestDir('new-dir')

      const transaction = createTransaction()

      transaction.trackCreatedDir('new-dir')

      // Mock statSync to throw error
      const fs = require('fs')
      const statSyncSpy = vi.spyOn(fs, 'statSync').mockImplementation(() => {
        throw new Error('Permission denied')
      })

      // Rollback should handle error gracefully
      expect(() => transaction.rollback()).not.toThrow()
      expect(transaction.isRolledBackState()).toBe(true)

      statSyncSpy.mockRestore()
    })

    it('should handle rmdirSync errors gracefully', () => {
      createTestDir('new-dir')

      const transaction = createTransaction()

      transaction.trackCreatedDir('new-dir')

      // Mock rmdirSync to throw error
      const fs = require('fs')
      const rmdirSyncSpy = vi.spyOn(fs, 'rmdirSync').mockImplementation(() => {
        throw new Error('Permission denied')
      })

      // Rollback should handle error gracefully (error is caught and ignored)
      expect(() => transaction.rollback()).not.toThrow()
      expect(transaction.isRolledBackState()).toBe(true)

      rmdirSyncSpy.mockRestore()
    })

    it('should skip directory removal if directory does not exist', () => {
      const transaction = createTransaction()

      // Track a directory that doesn't exist
      transaction.trackCreatedDir('non-existent-dir')

      // Rollback should not throw error
      expect(() => transaction.rollback()).not.toThrow()
      expect(transaction.isRolledBackState()).toBe(true)
    })

    it('should handle outer catch block errors in removeCreatedDirs', () => {
      createTestDir('new-dir')

      const transaction = createTransaction({ verbose: true })

      transaction.trackCreatedDir('new-dir')

      // Mock existsSync to throw error in outer catch block
      const fs = require('fs')
      const existsSyncSpy = vi.spyOn(fs, 'existsSync').mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

      transaction.rollback()

      // Should handle error gracefully and log warning
      expect(consoleSpy).toHaveBeenCalled()
      expect(transaction.isRolledBackState()).toBe(true)

      existsSyncSpy.mockRestore()
      consoleSpy.mockRestore()
    })
  })

  describe('verbose logging', () => {
    it('should log verbose messages during rollback', () => {
      createTestFile('test.txt', 'content')

      const transaction = createTransaction({ verbose: true })

      transaction.backupFile('test.txt')
      transaction.trackCreatedFile('new-file.txt')

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

      transaction.rollback()

      // Should log verbose messages
      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleSpy.mock.calls.some((call) => call[0]?.includes('Rolling back transaction'))).toBe(true)
      expect(consoleSpy.mock.calls.some((call) => call[0]?.includes('Rollback completed'))).toBe(true)

      consoleSpy.mockRestore()
    })

    it('should log verbose message during commit', () => {
      const transaction = createTransaction({ verbose: true })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

      transaction.commit()

      // Should log verbose message about commit
      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleSpy.mock.calls.some((call) => call[0]?.includes('committed'))).toBe(true)

      consoleSpy.mockRestore()
    })

    it('should not log when verbose is false', () => {
      const transaction = createTransaction()

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

      transaction.commit()

      // Should not log when verbose is false
      expect(consoleSpy).not.toHaveBeenCalled()

      // Test rollback separately (without commit first)
      const transaction2 = createTransaction()

      transaction2.rollback()

      // Should not log when verbose is false
      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})

