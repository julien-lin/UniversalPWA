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
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <img
              src="/logo.png"
              alt="UniversalPWA - PWA Generator Logo"
              className="h-9 w-9 object-contain transition-opacity group-hover:opacity-80"
            />
            <span className="text-lg font-semibold tracking-tight" style={{ color: '#2C736B' }}>
              UniversalPWA
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/')
                  ? 'text-white'
                  : 'text-gray-600 hover:text-white'
              }`}
              style={isActive('/') ? { backgroundColor: '#45A596' } : {}}
              onMouseEnter={(e) => {
                if (!isActive('/')) {
                  e.currentTarget.style.backgroundColor = '#f0fdfa'
                  e.currentTarget.style.color = '#45A596'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/')) {
                  e.currentTarget.style.backgroundColor = ''
                  e.currentTarget.style.color = ''
                }
              }}
            >
              {t.nav.home}
            </Link>
            <Link
              to="/features"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/features')
                  ? 'text-gray-900 bg-gray-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t.nav.features}
            </Link>
            <Link
              to="/sponsors"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/sponsors')
                  ? 'text-gray-900 bg-gray-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t.nav.sponsors}
            </Link>
            <a
              href="https://github.com/julien-lin/UniversalPWA"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg transition-all duration-200 ml-2"
              style={{ color: '#6b7280' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#45A596'
                e.currentTarget.style.backgroundColor = '#f0fdfa'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#6b7280'
                e.currentTarget.style.backgroundColor = ''
              }}
            >
              <FiGithub className="w-5 h-5" />
            </a>

            {/* Language Selector */}
            <div className="flex items-center space-x-1 border-l border-gray-200 pl-4 ml-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    language === lang.code
                      ? 'text-white'
                      : 'text-gray-500'
                  }`}
                  style={language === lang.code ? { backgroundColor: '#45A596' } : {}}
                  onMouseEnter={(e) => {
                    if (language !== lang.code) {
                      e.currentTarget.style.color = '#45A596'
                      e.currentTarget.style.backgroundColor = '#f0fdfa'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (language !== lang.code) {
                      e.currentTarget.style.color = ''
                      e.currentTarget.style.backgroundColor = ''
                    }
                  }}
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
              {t.footer.github}
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

