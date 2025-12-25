import { Link, useLocation } from 'react-router-dom'
import { FiMenu, FiX, FiGithub } from 'react-icons/fi'
import { useState } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { useLanguage } from '../contexts/LanguageContext'
import type { Language } from '../i18n/translations'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const t = useTranslation()
  const { language, setLanguage } = useLanguage()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'fr', label: 'FR' },
    { code: 'es', label: 'ES' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <img
              src="/logo.png"
              alt="UniversalPWA - PWA Generator Logo"
              className="h-10 w-10 object-contain"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-indigo-700 bg-clip-text text-transparent">
              UniversalPWA
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'text-teal-600 bg-teal-50'
                  : 'text-gray-700 hover:text-teal-600 hover:bg-gray-50'
              }`}
            >
              {t.nav.home}
            </Link>
            <Link
              to="/features"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/features')
                  ? 'text-teal-600 bg-teal-50'
                  : 'text-gray-700 hover:text-teal-600 hover:bg-gray-50'
              }`}
            >
              {t.nav.features}
            </Link>
            <Link
              to="/sponsors"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/sponsors')
                  ? 'text-teal-600 bg-teal-50'
                  : 'text-gray-700 hover:text-teal-600 hover:bg-gray-50'
              }`}
            >
              {t.nav.sponsors}
            </Link>
            <a
              href="https://github.com/julien-lin/UniversalPWA"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-gray-900 transition-colors"
            >
              <FiGithub className="w-5 h-5" />
            </a>

            {/* Language Selector */}
            <div className="flex items-center space-x-1 border-l border-gray-200 pl-4">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
                    language === lang.code
                      ? 'text-teal-600 bg-teal-50'
                      : 'text-gray-600 hover:text-teal-600 hover:bg-gray-50'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
          >
            {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/')
                  ? 'text-teal-600 bg-teal-50'
                  : 'text-gray-700 hover:text-teal-600 hover:bg-gray-50'
              }`}
            >
              {t.nav.home}
            </Link>
            <Link
              to="/features"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/features')
                  ? 'text-teal-600 bg-teal-50'
                  : 'text-gray-700 hover:text-teal-600 hover:bg-gray-50'
              }`}
            >
              {t.nav.features}
            </Link>
            <Link
              to="/sponsors"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/sponsors')
                  ? 'text-teal-600 bg-teal-50'
                  : 'text-gray-700 hover:text-teal-600 hover:bg-gray-50'
              }`}
            >
              {t.nav.sponsors}
            </Link>
            <a
              href="https://github.com/julien-lin/UniversalPWA"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-teal-600 hover:bg-gray-50"
            >
              GitHub
            </a>
            <div className="flex items-center space-x-2 px-3 py-2 border-t border-gray-200 mt-2 pt-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code)
                    setMobileMenuOpen(false)
                  }}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    language === lang.code
                      ? 'text-teal-600 bg-teal-50'
                      : 'text-gray-600 hover:text-teal-600 hover:bg-gray-50'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

