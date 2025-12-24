import { useLanguage } from '../contexts/LanguageContext'
import { translations, type Translations } from '../i18n/translations'

export function useTranslation(): Translations {
  const { language } = useLanguage()
  return translations[language]
}

