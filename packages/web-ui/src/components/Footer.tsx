import { Link } from 'react-router-dom'
import { FiGithub, FiHeart } from 'react-icons/fi'
import { useTranslation } from '../hooks/useTranslation'

export function Footer() {
  const t = useTranslation()

  return (
    <footer className="bg-gray-900 text-gray-400 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-5">
              <img
                src="/logo.png"
                alt="UniversalPWA - PWA Generator and Converter"
                className="h-8 w-8 object-contain"
              />
              <span className="text-lg font-semibold" style={{ color: '#45A596' }}>UniversalPWA</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-md text-sm leading-relaxed">{t.footer.description}</p>
            <a
              href="https://github.com/julien-lin/UniversalPWA"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 transition-colors duration-200 text-sm"
              style={{ color: '#9ca3af' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#45A596'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
            >
              <FiGithub className="w-4 h-4" />
              <span>{t.footer.github}</span>
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-medium mb-4 text-sm">{t.footer.quickLinks}</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="transition-colors duration-200 text-sm" style={{ color: '#9ca3af' }} onMouseEnter={(e) => e.currentTarget.style.color = '#45A596'} onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}>
                  {t.footer.links.home}
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-white transition-colors duration-200 text-sm">
                  {t.footer.links.features}
                </Link>
              </li>
              <li>
                <Link to="/sponsors" className="hover:text-white transition-colors duration-200 text-sm">
                  {t.footer.links.sponsors}
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/julien-lin/UniversalPWA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-200 text-sm"
                  style={{ color: '#9ca3af' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#14b8a6'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                >
                  {t.footer.links.docs}
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-medium mb-4 text-sm">{t.footer.support}</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://github.com/julien-lin/UniversalPWA/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-200 text-sm"
                  style={{ color: '#9ca3af' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#14b8a6'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                >
                  {t.sponsorsPage.githubDiscussions}
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/sponsors/julien-lin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-200 inline-flex items-center space-x-1 text-sm"
                  style={{ color: '#9ca3af' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#14b8a6'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                >
                  <FiHeart className="w-4 h-4" />
                  <span>{t.footer.sponsor}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-xs text-gray-500">
          <p>{t.footer.copyright}</p>
        </div>
      </div>
    </footer>
  )
}

