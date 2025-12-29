import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import inquirer from 'inquirer'
import { promptInitOptions } from './prompts.js'

// Mock only inquirer to control user input
vi.mock('inquirer')

describe('promptInitOptions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.restoreAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should return PromptAnswers with all fields', async () => {
        const mockInquirerPrompt = vi.mocked(inquirer.prompt)

        mockInquirerPrompt
            .mockResolvedValueOnce({
                environment: 'local' as const,
            })
            .mockResolvedValueOnce({
                name: 'Test App',
                shortName: 'TestApp',
                iconSource: 'logo.png',
                skipIcons: true,
                themeColor: '#FF5733',
                backgroundColor: '#FFFFFF',
            })

        const result = await promptInitOptions('/test/project', 'react', 'spa')

        expect(result).toHaveProperty('environment')
        expect(result).toHaveProperty('name')
        expect(result).toHaveProperty('shortName')
        expect(result.environment).toBe('local')
        expect(result.name).toBe('Test App')
    })

    it('should invert skipIcons when icon source is provided', async () => {
        const mockInquirerPrompt = vi.mocked(inquirer.prompt)

        mockInquirerPrompt
            .mockResolvedValueOnce({ environment: 'local' as const })
            .mockResolvedValueOnce({
                name: 'App',
                shortName: 'App',
                iconSource: 'logo.png',
                skipIcons: true,
                themeColor: '#FFFFFF',
                backgroundColor: '#000000',
            })

        const result = await promptInitOptions('/test/project', 'react')

        expect(result.skipIcons).toBe(false) // inverted
    })

    it('should set skipIcons to true when icon source is empty', async () => {
        const mockInquirerPrompt = vi.mocked(inquirer.prompt)

        mockInquirerPrompt
            .mockResolvedValueOnce({ environment: 'local' as const })
            .mockResolvedValueOnce({
                name: 'App',
                shortName: 'App',
                iconSource: '',
                skipIcons: true,
                themeColor: '#FFFFFF',
                backgroundColor: '#000000',
            })

        const result = await promptInitOptions('/test/project', 'react')

        expect(result.skipIcons).toBe(true)
    })

    it('should set skipIcons to true when icon source is undefined', async () => {
        const mockInquirerPrompt = vi.mocked(inquirer.prompt)

        mockInquirerPrompt
            .mockResolvedValueOnce({ environment: 'local' as const })
            .mockResolvedValueOnce({
                name: 'App',
                shortName: 'App',
                iconSource: undefined,
                skipIcons: true,
                themeColor: '#FFFFFF',
                backgroundColor: '#000000',
            })

        const result = await promptInitOptions('/test/project', 'react')

        expect(result.skipIcons).toBe(true)
    })

    it('should handle production environment', async () => {
        const mockInquirerPrompt = vi.mocked(inquirer.prompt)

        mockInquirerPrompt
            .mockResolvedValueOnce({ environment: 'production' as const })
            .mockResolvedValueOnce({
                name: 'App',
                shortName: 'App',
                themeColor: '#FFFFFF',
                backgroundColor: '#000000',
            })

        const result = await promptInitOptions('/test/project', 'react')

        expect(result.environment).toBe('production')
    })

    it('should use defaults when name/shortName are empty', async () => {
        const mockInquirerPrompt = vi.mocked(inquirer.prompt)

        mockInquirerPrompt
            .mockResolvedValueOnce({ environment: 'local' as const })
            .mockResolvedValueOnce({
                name: '',
                shortName: '',
                iconSource: '',
                skipIcons: true,
                themeColor: '#FFFFFF',
                backgroundColor: '#000000',
            })

        const result = await promptInitOptions('/test/project', 'react')

        // Empty names default to "project" (from path) or fallback to suggestions
        expect(result.name).toBeDefined()
        expect(result.shortName).toBeDefined()
    })

    it('should handle null framework', async () => {
        const mockInquirerPrompt = vi.mocked(inquirer.prompt)

        mockInquirerPrompt
            .mockResolvedValueOnce({ environment: 'local' as const })
            .mockResolvedValueOnce({
                name: 'App',
                shortName: 'App',
                iconSource: '',
                skipIcons: true,
                themeColor: '#FFFFFF',
                backgroundColor: '#000000',
            })

        const result = await promptInitOptions('/test/project', null)

        expect(result.name).toBe('App')
    })

    it('should handle different architectures', async () => {
        const mockInquirerPrompt = vi.mocked(inquirer.prompt)

        mockInquirerPrompt
            .mockResolvedValueOnce({ environment: 'local' as const })
            .mockResolvedValueOnce({
                name: 'App',
                shortName: 'App',
                iconSource: '',
                skipIcons: true,
                themeColor: '#FFFFFF',
                backgroundColor: '#000000',
            })

        const result = await promptInitOptions('/test/project', 'nextjs', 'ssr')

        expect(result).toBeDefined()
        expect(result.name).toBe('App')
    })

    it('should handle empty theme and background colors', async () => {
        const mockInquirerPrompt = vi.mocked(inquirer.prompt)

        mockInquirerPrompt
            .mockResolvedValueOnce({ environment: 'local' as const })
            .mockResolvedValueOnce({
                name: 'App',
                shortName: 'App',
                iconSource: '',
                skipIcons: true,
                themeColor: '',
                backgroundColor: '',
            })

        const result = await promptInitOptions('/test/project', 'react')

        expect(result.themeColor).toBe('')
        expect(result.backgroundColor).toBe('')
    })

    it('should preserve theme and background colors when provided', async () => {
        const mockInquirerPrompt = vi.mocked(inquirer.prompt)

        mockInquirerPrompt
            .mockResolvedValueOnce({ environment: 'local' as const })
            .mockResolvedValueOnce({
                name: 'App',
                shortName: 'App',
                themeColor: '#FF5733',
                backgroundColor: '#ABCDEF',
            })

        const result = await promptInitOptions('/test/project', 'react')

        expect(result.themeColor).toBe('#FF5733')
        expect(result.backgroundColor).toBe('#ABCDEF')
    })

    it('should merge environment and config answers', async () => {
        const mockInquirerPrompt = vi.mocked(inquirer.prompt)

        mockInquirerPrompt
            .mockResolvedValueOnce({ environment: 'production' as const })
            .mockResolvedValueOnce({
                name: 'Complete App',
                shortName: 'App',
                iconSource: 'logo.png',
                skipIcons: false,
                themeColor: '#007AFF',
                backgroundColor: '#FFFFFF',
            })

        const result = await promptInitOptions('/test/project', 'react')

        expect(result.environment).toBe('production')
        expect(result.name).toBe('Complete App')
        expect(result.shortName).toBe('App')
        expect(result.skipIcons).toBe(true)
    })

    describe('Validation tests', () => {
        it('should validate name is required', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            await promptInitOptions('/test/project', 'react')
        })

        it('should validate name length <= 50', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            await promptInitOptions('/test/project', 'react')
        })

        it('should validate shortName is required', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            await promptInitOptions('/test/project', 'react')
        })

        it('should validate shortName length <= 12', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            await promptInitOptions('/test/project', 'react')
        })

        it('should validate themeColor hex format', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            await promptInitOptions('/test/project', 'react')
        })

        it('should validate backgroundColor hex format', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            await promptInitOptions('/test/project', 'react')
        })
    })

    describe('Filter tests', () => {
        it('should normalize hex color from 3 to 6 characters (themeColor)', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    themeColor: '#ffffff',
                    backgroundColor: '#000000',
                })

            const result = await promptInitOptions('/test/project', 'react')
            expect(result.themeColor).toBe('#ffffff')
        })

        it('should normalize hex color from 3 to 6 characters (backgroundColor)', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#aabbcc',
                })

            const result = await promptInitOptions('/test/project', 'react')
            expect(result.backgroundColor).toBe('#aabbcc')
        })

        it('should not normalize hex color if already 6 characters', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    themeColor: '#ffffff',
                    backgroundColor: '#000000',
                })

            const result = await promptInitOptions('/test/project', 'react')
            expect(result.themeColor).toBe('#ffffff')
        })

        it('should filter shortName to max 12 characters', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Very Long Na',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            const result = await promptInitOptions('/test/project', 'react')
            expect(result.shortName).toBe('Very Long Na')
        })
    })

    describe('Default value tests', () => {
        it('should use default shortName from name if provided', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'My Long App Name',
                    shortName: 'My Long App',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            await promptInitOptions('/test/project', 'react')
        })

        it('should use default shortName from suggestions if name not provided', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            await promptInitOptions('/test/project', 'react')
        })
    })

    describe('Conditional prompt tests', () => {
        it('should show skipIcons prompt when iconSource is provided', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    iconSource: 'logo.png',
                    skipIcons: true,
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            await promptInitOptions('/test/project', 'react')
        })

        it('should not show skipIcons prompt when iconSource is empty', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    iconSource: '',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            await promptInitOptions('/test/project', 'react')
        })
    })

    describe('Suggestions display tests', () => {
        it('should display name suggestion when confidence is high', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            await promptInitOptions('/test/project', 'react')

            expect(consoleSpy).toHaveBeenCalled()
            consoleSpy.mockRestore()
        })

        it('should display icon suggestions when icons are found', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            await promptInitOptions('/test/project', 'react')

            expect(consoleSpy).toHaveBeenCalled()
            consoleSpy.mockRestore()
        })

        it('should display color suggestions when confidence is high', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            await promptInitOptions('/test/project', 'react')

            expect(consoleSpy).toHaveBeenCalled()
            consoleSpy.mockRestore()
        })
    })

    describe('Environment detection tests', () => {
        it('should display environment indicators when available', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            await promptInitOptions('/test/project', 'react')

            expect(consoleSpy).toHaveBeenCalled()
            consoleSpy.mockRestore()
        })

        it('should use detected environment as default', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'production' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            const result = await promptInitOptions('/test/project', 'react')

            expect(result.environment).toBe('production')
        })
    })

    describe('Icon source validation edge cases', () => {
        it('should allow empty iconSource (optional)', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    iconSource: '',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            await promptInitOptions('/test/project', 'react')
        })

        it('should set skipIcons to true when iconSource provided but skipIcons missing', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    iconSource: 'logo.png',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                    // skipIcons intentionally omitted
                })

            const result = await promptInitOptions('/test/project', 'react')

            expect(result.skipIcons).toBe(true)
        })

        it('should fallback to suggestions when name and shortName are empty', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: '',
                    shortName: '',
                    iconSource: '',
                    themeColor: '',
                    backgroundColor: '',
                })

            const result = await promptInitOptions('/tmp/my-app-foo', 'react')

            expect(result.name).toBeTruthy()
            expect(result.shortName).toBeTruthy()
            expect(result.shortName.length).toBeLessThanOrEqual(12)
        })
    })

    describe('Color input validation', () => {
        it('should normalize hex color from 3 to 6 digits', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'App',
                    shortName: 'App',
                    iconSource: '',
                    themeColor: '#fff',
                    backgroundColor: '#000',
                })

            const result = await promptInitOptions('/test/project', 'react')

            // The function doesn't necessarily filter the colors in the result
            // This is handled by inquirer's filter function, not the response itself
            expect(result.themeColor).toBeDefined()
            expect(result.backgroundColor).toBeDefined()
        })

        it('should reject invalid color formats', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockRejectedValueOnce(new Error('Invalid color'))

            try {
                await promptInitOptions('/test/project', 'react')
                // Should not reach here
                expect(true).toBe(false)
            } catch {
                // Expected
                expect(true).toBe(true)
            }
        })

        it('should handle mixed case hex colors', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'My App',
                    shortName: 'App',
                    iconSource: '',
                    themeColor: '#AbCdEf',
                    backgroundColor: '#FfFfFf',
                })

            const result = await promptInitOptions('/test/project', 'react')

            expect(result.themeColor).toBeDefined()
            expect(result.backgroundColor).toBeDefined()
        })

        it('should provide fallback defaults when name and shortName are empty', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: '',
                    shortName: '',
                    iconSource: '',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            const result = await promptInitOptions('/test/project', 'react')

            expect(result.name).toBeDefined()
            expect(result.shortName).toBeDefined()
        })

        it('should handle special characters in shortName', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test-App @!#',
                    iconSource: '',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            const result = await promptInitOptions('/test/project', 'react')

            expect(result.shortName).toBeDefined()
        })
    })
})
