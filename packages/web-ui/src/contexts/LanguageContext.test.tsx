import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LanguageProvider, useLanguage } from './LanguageContext'

function ConsumerDisplay() {
  const { language, setLanguage } = useLanguage()
  return (
    <div>
      <span data-testid="current-language">{language}</span>
      <button type="button" onClick={() => setLanguage('fr')}>
        Set FR
      </button>
      <button type="button" onClick={() => setLanguage('es')}>
        Set ES
      </button>
      <button type="button" onClick={() => setLanguage('en')}>
        Set EN
      </button>
    </div>
  )
}

describe('LanguageContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en')
  })

  it('should provide default language (en) when no saved preference', () => {
    render(
      <LanguageProvider>
        <ConsumerDisplay />
      </LanguageProvider>,
    )
    expect(screen.getByTestId('current-language')).toHaveTextContent('en')
  })

  it('should restore language from localStorage when valid', () => {
    localStorage.setItem('universalpwa-language', 'fr')
    render(
      <LanguageProvider>
        <ConsumerDisplay />
      </LanguageProvider>,
    )
    expect(screen.getByTestId('current-language')).toHaveTextContent('fr')
  })

  it('should update language when setLanguage is called and persist to localStorage', async () => {
    const user = userEvent.setup()
    render(
      <LanguageProvider>
        <ConsumerDisplay />
      </LanguageProvider>,
    )
    expect(screen.getByTestId('current-language')).toHaveTextContent('en')

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Set FR' }))
    })
    expect(screen.getByTestId('current-language')).toHaveTextContent('fr')
    expect(localStorage.getItem('universalpwa-language')).toBe('fr')

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Set ES' }))
    })
    expect(screen.getByTestId('current-language')).toHaveTextContent('es')
    expect(localStorage.getItem('universalpwa-language')).toBe('es')
  })

  it('should throw when useLanguage is used outside LanguageProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<ConsumerDisplay />)).toThrow(
      'useLanguage must be used within LanguageProvider',
    )
    consoleSpy.mockRestore()
  })
})
