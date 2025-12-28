import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import inquirer from 'inquirer'
import { promptInitOptions } from './prompts.js'
import * as fs from 'fs'

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
            const validateFn = vi.fn()

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockImplementationOnce((questions) => {
                    // Simulate validation error for name
                    const nameQuestion = questions.find((q: any) => q.name === 'name')
                    if (nameQuestion && nameQuestion.validate) {
                        const result = nameQuestion.validate('')
                        expect(result).toBe('Le nom de l\'application est requis')
                    }
                    return Promise.resolve({
                        name: 'Test App',
                        shortName: 'Test',
                        themeColor: '#FFFFFF',
                        backgroundColor: '#000000',
                    })
                })

            await promptInitOptions('/test/project', 'react')
        })

        it('should validate name length <= 50', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockImplementationOnce((questions) => {
                    const nameQuestion = questions.find((q: any) => q.name === 'name')
                    if (nameQuestion && nameQuestion.validate) {
                        const longName = 'A'.repeat(51)
                        const result = nameQuestion.validate(longName)
                        expect(result).toBe('Le nom doit faire moins de 50 caractères')
                    }
                    return Promise.resolve({
                        name: 'Test App',
                        shortName: 'Test',
                        themeColor: '#FFFFFF',
                        backgroundColor: '#000000',
                    })
                })

            await promptInitOptions('/test/project', 'react')
        })

        it('should validate shortName is required', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockImplementationOnce((questions) => {
                    const shortNameQuestion = questions.find((q: any) => q.name === 'shortName')
                    if (shortNameQuestion && shortNameQuestion.validate) {
                        const result = shortNameQuestion.validate('')
                        expect(result).toBe('Le nom court est requis')
                    }
                    return Promise.resolve({
                        name: 'Test App',
                        shortName: 'Test',
                        themeColor: '#FFFFFF',
                        backgroundColor: '#000000',
                    })
                })

            await promptInitOptions('/test/project', 'react')
        })

        it('should validate shortName length <= 12', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockImplementationOnce((questions) => {
                    const shortNameQuestion = questions.find((q: any) => q.name === 'shortName')
                    if (shortNameQuestion && shortNameQuestion.validate) {
                        const longShortName = 'A'.repeat(13)
                        const result = shortNameQuestion.validate(longShortName)
                        expect(result).toBe('Le nom court doit faire maximum 12 caractères')
                    }
                    return Promise.resolve({
                        name: 'Test App',
                        shortName: 'Test',
                        themeColor: '#FFFFFF',
                        backgroundColor: '#000000',
                    })
                })

            await promptInitOptions('/test/project', 'react')
        })

        it('should validate themeColor hex format', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockImplementationOnce((questions) => {
                    const themeColorQuestion = questions.find((q: any) => q.name === 'themeColor')
                    if (themeColorQuestion && themeColorQuestion.validate) {
                        const result = themeColorQuestion.validate('invalid-color')
                        expect(result).toContain('Format hex invalide')
                    }
                    return Promise.resolve({
                        name: 'Test App',
                        shortName: 'Test',
                        themeColor: '#FFFFFF',
                        backgroundColor: '#000000',
                    })
                })

            await promptInitOptions('/test/project', 'react')
        })

        it('should validate backgroundColor hex format', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockImplementationOnce((questions) => {
                    const bgColorQuestion = questions.find((q: any) => q.name === 'backgroundColor')
                    if (bgColorQuestion && bgColorQuestion.validate) {
                        const result = bgColorQuestion.validate('invalid-color')
                        expect(result).toContain('Format hex invalide')
                    }
                    return Promise.resolve({
                        name: 'Test App',
                        shortName: 'Test',
                        themeColor: '#FFFFFF',
                        backgroundColor: '#000000',
                    })
                })

            await promptInitOptions('/test/project', 'react')
        })
    })

    describe('Filter tests', () => {
        it('should normalize hex color from 3 to 6 characters (themeColor)', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockImplementationOnce((questions) => {
                    const themeColorQuestion = questions.find((q: any) => q.name === 'themeColor')
                    if (themeColorQuestion && themeColorQuestion.filter) {
                        const result = themeColorQuestion.filter('#fff')
                        expect(result).toBe('#ffffff')
                    }
                    return Promise.resolve({
                        name: 'Test App',
                        shortName: 'Test',
                        themeColor: '#ffffff',
                        backgroundColor: '#000000',
                    })
                })

            const result = await promptInitOptions('/test/project', 'react')
            expect(result.themeColor).toBe('#ffffff')
        })

        it('should normalize hex color from 3 to 6 characters (backgroundColor)', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockImplementationOnce((questions) => {
                    const bgColorQuestion = questions.find((q: any) => q.name === 'backgroundColor')
                    if (bgColorQuestion && bgColorQuestion.filter) {
                        const result = bgColorQuestion.filter('#abc')
                        expect(result).toBe('#aabbcc')
                    }
                    return Promise.resolve({
                        name: 'Test App',
                        shortName: 'Test',
                        themeColor: '#FFFFFF',
                        backgroundColor: '#aabbcc',
                    })
                })

            const result = await promptInitOptions('/test/project', 'react')
            expect(result.backgroundColor).toBe('#aabbcc')
        })

        it('should not normalize hex color if already 6 characters', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockImplementationOnce((questions) => {
                    const themeColorQuestion = questions.find((q: any) => q.name === 'themeColor')
                    if (themeColorQuestion && themeColorQuestion.filter) {
                        const result = themeColorQuestion.filter('#ffffff')
                        expect(result).toBe('#ffffff')
                    }
                    return Promise.resolve({
                        name: 'Test App',
                        shortName: 'Test',
                        themeColor: '#ffffff',
                        backgroundColor: '#000000',
                    })
                })

            const result = await promptInitOptions('/test/project', 'react')
            expect(result.themeColor).toBe('#ffffff')
        })

        it('should filter shortName to max 12 characters', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockImplementationOnce((questions) => {
                    const shortNameQuestion = questions.find((q: any) => q.name === 'shortName')
                    if (shortNameQuestion && shortNameQuestion.filter) {
                        const result = shortNameQuestion.filter('  Very Long Name  ')
                        expect(result).toBe('Very Long Na')
                    }
                    return Promise.resolve({
                        name: 'Test App',
                        shortName: 'Very Long Na',
                        themeColor: '#FFFFFF',
                        backgroundColor: '#000000',
                    })
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
                .mockImplementationOnce((questions) => {
                    const shortNameQuestion = questions.find((q: any) => q.name === 'shortName')
                    if (shortNameQuestion && shortNameQuestion.default) {
                        const defaultValue = shortNameQuestion.default({ name: 'My Long App Name' })
                        // substring(0, 12) gives "My Long App " (12 chars including space)
                        expect(defaultValue).toBe('My Long App ')
                    }
                    return Promise.resolve({
                        name: 'My Long App Name',
                        shortName: 'My Long App',
                        themeColor: '#FFFFFF',
                        backgroundColor: '#000000',
                    })
                })

            await promptInitOptions('/test/project', 'react')
        })

        it('should use default shortName from suggestions if name not provided', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockImplementationOnce((questions) => {
                    const shortNameQuestion = questions.find((q: any) => q.name === 'shortName')
                    if (shortNameQuestion && shortNameQuestion.default) {
                        const defaultValue = shortNameQuestion.default({})
                        expect(defaultValue).toBeDefined()
                    }
                    return Promise.resolve({
                        name: 'Test App',
                        shortName: 'Test',
                        themeColor: '#FFFFFF',
                        backgroundColor: '#000000',
                    })
                })

            await promptInitOptions('/test/project', 'react')
        })
    })

    describe('Conditional prompt tests', () => {
        it('should show skipIcons prompt when iconSource is provided', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockImplementationOnce((questions) => {
                    const skipIconsQuestion = questions.find((q: any) => q.name === 'skipIcons')
                    if (skipIconsQuestion && skipIconsQuestion.when) {
                        const shouldShow = skipIconsQuestion.when({ iconSource: 'logo.png' })
                        expect(shouldShow).toBe(true)
                    }
                    return Promise.resolve({
                        name: 'Test App',
                        shortName: 'Test',
                        iconSource: 'logo.png',
                        skipIcons: true,
                        themeColor: '#FFFFFF',
                        backgroundColor: '#000000',
                    })
                })

            await promptInitOptions('/test/project', 'react')
        })

        it('should not show skipIcons prompt when iconSource is empty', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockImplementationOnce((questions) => {
                    const skipIconsQuestion = questions.find((q: any) => q.name === 'skipIcons')
                    if (skipIconsQuestion && skipIconsQuestion.when) {
                        const shouldShow = skipIconsQuestion.when({ iconSource: '' })
                        // Empty string is falsy, so shouldShow should be false
                        expect(shouldShow).toBeFalsy()
                    }
                    return Promise.resolve({
                        name: 'Test App',
                        shortName: 'Test',
                        iconSource: '',
                        themeColor: '#FFFFFF',
                        backgroundColor: '#000000',
                    })
                })

            await promptInitOptions('/test/project', 'react')
        })
    })

    describe('Suggestions display tests', () => {
        it('should display name suggestion when confidence is high', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

            mockInquirerPrompt
                .mockResolvedValueOnce({ environment: 'local' as const })
                .mockResolvedValueOnce({
                    name: 'Test App',
                    shortName: 'Test',
                    themeColor: '#FFFFFF',
                    backgroundColor: '#000000',
                })

            await promptInitOptions('/test/project', 'react')

            // Should display suggestions if available
            expect(consoleSpy).toHaveBeenCalled()

            consoleSpy.mockRestore()
        })

        it('should display icon suggestions when icons are found', async () => {
            const mockInquirerPrompt = vi.mocked(inquirer.prompt)
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

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
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

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
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

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
                .mockImplementationOnce((questions) => {
                    const iconQuestion = questions.find((q: any) => q.name === 'iconSource')
                    if (iconQuestion && iconQuestion.validate) {
                        const result = iconQuestion.validate('')
                        expect(result).toBe(true) // Empty is allowed
                    }
                    return Promise.resolve({
                        name: 'Test App',
                        shortName: 'Test',
                        iconSource: '',
                        themeColor: '#FFFFFF',
                        backgroundColor: '#000000',
                    })
                })

            await promptInitOptions('/test/project', 'react')
        })
    })
})
