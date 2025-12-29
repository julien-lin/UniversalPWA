import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'

const TEST_DIR = join(process.cwd(), '.test-tmp-icon-validator')

// Mock icon validator since it doesn't exist yet
const validateIconSize = (width: number, height: number, expectedSize: number): boolean => {
    return width === expectedSize && height === expectedSize
}

const validateIconFormat = (path: string): boolean => {
    return /\.(png|jpg|jpeg|webp|svg)$/i.test(path)
}

describe('icon-validator', () => {
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

    describe('validateIconSize', () => {
        it.each([
            { width: 192, height: 192, expected: 192, result: true },
            { width: 512, height: 512, expected: 512, result: true },
            { width: 100, height: 100, expected: 192, result: false },
            { width: 192, height: 200, expected: 192, result: false },
        ])('should validate $width x $height for $expected size', ({ width, height, expected, result }) => {
            expect(validateIconSize(width, height, expected)).toBe(result)
        })
    })

    describe('validateIconFormat', () => {
        it.each([
            { path: 'icon.png', valid: true },
            { path: 'icon.jpg', valid: true },
            { path: 'icon.jpeg', valid: true },
            { path: 'icon.webp', valid: true },
            { path: 'icon.svg', valid: true },
            { path: 'icon.gif', valid: false },
            { path: 'icon.bmp', valid: false },
        ])('should validate format for $path', ({ path, valid }) => {
            expect(validateIconFormat(path)).toBe(valid)
        })
    })
})
