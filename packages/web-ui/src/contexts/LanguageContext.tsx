import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { Language } from '../i18n/translations'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('universalpwa-language') as Language | null
    if (saved && ['en', 'fr', 'es'].includes(saved)) {
      return saved
    }
    const browserLang = navigator.language.split('-')[0]
    if (browserLang === 'fr') return 'fr'
    if (browserLang === 'es') return 'es'
    return 'en'
  })

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('universalpwa-language', lang)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}

