/**
 * Tests for Generate Config Command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmdirSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { generateConfigCommand } from './generate-config.js'
import inquirer from 'inquirer'

vi.mock('inquirer')

describe('generate-config', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `universal-pwa-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    mkdirSync(join(testDir, 'public'), { recursive: true })

    // Create minimal project files
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({ name: 'test-app' }))
    writeFileSync(join(testDir, 'public', 'index.html'), '<html><body>Test</body></html>')
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      try {
        rmdirSync(testDir, { recursive: true })
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  describe('generateConfigCommand', () => {
    it('should generate TypeScript config file', async () => {
      const mockInquirer = vi.mocked(inquirer.prompt)
      mockInquirer.mockResolvedValueOnce({
        overwrite: true,
      })
      mockInquirer.mockResolvedValueOnce({
        appName: 'Test App',
        appShortName: 'Test',
        appDescription: 'Test description',
        themeColor: '#000000',
        backgroundColor: '#FFFFFF',
        iconSource: '',
        generateSplashScreens: false,
        outputDir: 'public',
      })

      const result = await generateConfigCommand({
        projectPath: testDir,
        format: 'ts',
        interactive: true,
      })

      expect(result.success).toBe(true)
      expect(result.format).toBe('ts')
      expect(existsSync(result.filePath)).toBe(true)

      const content = readFileSync(result.filePath, 'utf-8')
      expect(content).toContain('import type { UniversalPWAConfig }')
      expect(content).toContain('export default config')
    })

    it('should generate JavaScript config file', async () => {
      const mockInquirer = vi.mocked(inquirer.prompt)
      mockInquirer.mockResolvedValueOnce({
        overwrite: true,
      })
      mockInquirer.mockResolvedValueOnce({
        appName: 'Test App',
        appShortName: 'Test',
        appDescription: 'Test description',
        themeColor: '#000000',
        backgroundColor: '#FFFFFF',
        iconSource: '',
        generateSplashScreens: false,
        outputDir: 'public',
      })

      const result = await generateConfigCommand({
        projectPath: testDir,
        format: 'js',
        interactive: true,
      })

      expect(result.success).toBe(true)
      expect(result.format).toBe('js')

      const content = readFileSync(result.filePath, 'utf-8')
      expect(content).toContain('module.exports = config')
    })

    it('should generate JSON config file', async () => {
      const mockInquirer = vi.mocked(inquirer.prompt)
      mockInquirer.mockResolvedValueOnce({
        overwrite: true,
      })
      mockInquirer.mockResolvedValueOnce({
        appName: 'Test App',
        appShortName: 'Test',
        appDescription: 'Test description',
        themeColor: '#000000',
        backgroundColor: '#FFFFFF',
        iconSource: '',
        generateSplashScreens: false,
        outputDir: 'public',
      })

      const result = await generateConfigCommand({
        projectPath: testDir,
        format: 'json',
        interactive: true,
      })

      expect(result.success).toBe(true)
      expect(result.format).toBe('json')

      const content = readFileSync(result.filePath, 'utf-8')
      const config = JSON.parse(content)
      expect(config.app).toBeDefined()
      expect(config.icons).toBeDefined()
    })

    it('should generate YAML config file', async () => {
      const mockInquirer = vi.mocked(inquirer.prompt)
      mockInquirer.mockResolvedValueOnce({
        overwrite: true,
      })
      mockInquirer.mockResolvedValueOnce({
        appName: 'Test App',
        appShortName: 'Test',
        appDescription: 'Test description',
        themeColor: '#000000',
        backgroundColor: '#FFFFFF',
        iconSource: '',
        generateSplashScreens: false,
        outputDir: 'public',
      })

      const result = await generateConfigCommand({
        projectPath: testDir,
        format: 'yaml',
        interactive: true,
      })

      expect(result.success).toBe(true)
      expect(result.format).toBe('yaml')

      const content = readFileSync(result.filePath, 'utf-8')
      expect(content).toContain('app:')
      expect(content).toContain('icons:')
    })

    it('should use custom output file name', async () => {
      const mockInquirer = vi.mocked(inquirer.prompt)
      mockInquirer.mockResolvedValueOnce({
        overwrite: true,
      })
      mockInquirer.mockResolvedValueOnce({
        appName: 'Test App',
        appShortName: 'Test',
        appDescription: 'Test description',
        themeColor: '#000000',
        backgroundColor: '#FFFFFF',
        iconSource: '',
        generateSplashScreens: false,
        outputDir: 'public',
      })

      const result = await generateConfigCommand({
        projectPath: testDir,
        format: 'json',
        output: 'custom-config.json',
        interactive: true,
      })

      expect(result.filePath).toBe(join(testDir, 'custom-config.json'))
    })

    it('should handle non-interactive mode', async () => {
      const result = await generateConfigCommand({
        projectPath: testDir,
        format: 'json',
        interactive: false,
      })

      expect(result.success).toBe(true)
      expect(existsSync(result.filePath)).toBe(true)
    })

    it('should not overwrite existing file without confirmation', async () => {
      // Create existing config file
      writeFileSync(join(testDir, 'universal-pwa.config.json'), '{}')

      const mockInquirer = vi.mocked(inquirer.prompt)
      mockInquirer.mockResolvedValueOnce({
        overwrite: false,
      })

      const result = await generateConfigCommand({
        projectPath: testDir,
        format: 'json',
        interactive: true,
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})
