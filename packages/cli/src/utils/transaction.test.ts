import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { Transaction } from './transaction.js'

const TEST_DIR = join(process.cwd(), '.test-tmp-transaction')

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
    const transaction = new Transaction({
      projectPath: TEST_DIR,
      verbose: false,
    })

    expect(transaction.getState().id).toBeDefined()
    expect(transaction.getState().id.length).toBe(8)
  })

  it('should backup existing file', () => {
    const filePath = join(TEST_DIR, 'test.txt')
    const originalContent = 'original content'
    writeFileSync(filePath, originalContent)

    const transaction = new Transaction({
      projectPath: TEST_DIR,
      verbose: false,
    })

    transaction.backupFile('test.txt')

    const state = transaction.getState()
    expect(state.backups.length).toBe(1)
    expect(state.backups[0].originalExists).toBe(true)
    expect(state.backups[0].originalContent?.toString()).toBe(originalContent)
  })

  it('should track created file', () => {
    const transaction = new Transaction({
      projectPath: TEST_DIR,
      outputDir: 'output',
      verbose: false,
    })

    transaction.trackCreatedFile('new-file.txt')

    const state = transaction.getState()
    expect(state.createdFiles.length).toBe(1)
    expect(state.createdFiles[0]).toContain('new-file.txt')
  })

  it('should track created directory', () => {
    const transaction = new Transaction({
      projectPath: TEST_DIR,
      outputDir: 'output',
      verbose: false,
    })

    transaction.trackCreatedDir('new-dir')

    const state = transaction.getState()
    expect(state.createdDirs.length).toBe(1)
  })

  it('should restore file on rollback', () => {
    const filePath = join(TEST_DIR, 'test.txt')
    const originalContent = 'original content'
    writeFileSync(filePath, originalContent)

    const transaction = new Transaction({
      projectPath: TEST_DIR,
      verbose: false,
    })

    transaction.backupFile('test.txt')

    // Modify file
    writeFileSync(filePath, 'modified content')

    // Rollback
    transaction.rollback()

    // File should be restored
    expect(readFileSync(filePath, 'utf-8')).toBe(originalContent)
    expect(transaction.isRolledBackState()).toBe(true)
  })

  it('should remove created file on rollback', () => {
    const filePath = join(TEST_DIR, 'new-file.txt')
    writeFileSync(filePath, 'new content')

    const transaction = new Transaction({
      projectPath: TEST_DIR,
      verbose: false,
    })

    transaction.trackCreatedFile('new-file.txt')

    // Rollback
    transaction.rollback()

    // File should be removed
    expect(existsSync(filePath)).toBe(false)
  })

  it('should remove created directory on rollback if empty', () => {
    const dirPath = join(TEST_DIR, 'new-dir')
    mkdirSync(dirPath, { recursive: true })

    const transaction = new Transaction({
      projectPath: TEST_DIR,
      verbose: false,
    })

    transaction.trackCreatedDir('new-dir')

    // Rollback
    transaction.rollback()

    // Directory should be removed if empty
    expect(existsSync(dirPath)).toBe(false)
  })

  it('should not remove non-empty directory on rollback', () => {
    const dirPath = join(TEST_DIR, 'new-dir')
    mkdirSync(dirPath, { recursive: true })
    writeFileSync(join(dirPath, 'file.txt'), 'content')

    const transaction = new Transaction({
      projectPath: TEST_DIR,
      verbose: false,
    })

    transaction.trackCreatedDir('new-dir')

    // Rollback
    transaction.rollback()

    // Directory should still exist (not empty)
    expect(existsSync(dirPath)).toBe(true)
  })

  it('should commit transaction', () => {
    const transaction = new Transaction({
      projectPath: TEST_DIR,
      verbose: false,
    })

    transaction.commit()

    expect(transaction.isCommittedState()).toBe(true)
    expect(transaction.isRolledBackState()).toBe(false)
  })

  it('should not allow rollback after commit', () => {
    const transaction = new Transaction({
      projectPath: TEST_DIR,
      verbose: false,
    })

    transaction.commit()

    expect(() => transaction.rollback()).toThrow('Cannot rollback a committed transaction')
  })

  it('should not allow commit after rollback', () => {
    const transaction = new Transaction({
      projectPath: TEST_DIR,
      verbose: false,
    })

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
    const filePath = join(TEST_DIR, 'new-file.txt')
    // File doesn't exist initially

    const transaction = new Transaction({
      projectPath: TEST_DIR,
      verbose: false,
    })

    // Backup non-existent file (will mark as not existing)
    transaction.backupFile('new-file.txt')

    // Now create the file (simulating it was created during transaction)
    writeFileSync(filePath, 'new content')

    // Rollback should remove the file (restore to non-existent state)
    transaction.rollback()

    expect(existsSync(filePath)).toBe(false)
  })

  it('should handle multiple backups and created files', () => {
    const file1 = join(TEST_DIR, 'file1.txt')
    const file2 = join(TEST_DIR, 'file2.txt')
    writeFileSync(file1, 'content1')
    writeFileSync(file2, 'content2')

    const transaction = new Transaction({
      projectPath: TEST_DIR,
      verbose: false,
    })

    transaction.backupFile('file1.txt')
    transaction.backupFile('file2.txt')
    transaction.trackCreatedFile('new-file.txt')

    const state = transaction.getState()
    expect(state.backups.length).toBe(2)
    expect(state.createdFiles.length).toBe(1)
  })
})

