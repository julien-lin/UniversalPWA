import { Link } from 'react-router-dom'
import { FiGithub, FiHeart } from 'react-icons/fi'
import { useTranslation } from '../hooks/useTranslation'

export function Footer() {
  const t = useTranslation()

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <img
                src="/logo.png"
                alt="UniversalPWA - PWA Generator and Converter"
                className="h-8 w-8 object-contain"
              />
              <span className="text-xl font-bold text-white">UniversalPWA</span>
            </div>
            <p className="text-gray-400 mb-4 max-w-md">{t.footer.description}</p>
            <a
              href="https://github.com/julien-lin/UniversalPWA"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <FiGithub className="w-5 h-5" />
              <span>GitHub</span>
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  {t.footer.links.home}
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-white transition-colors">
                  {t.footer.links.features}
                </Link>
              </li>
              <li>
                <Link to="/sponsors" className="hover:text-white transition-colors">
                  {t.footer.links.sponsors}
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/julien-lin/UniversalPWA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  {t.footer.links.docs}
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/julien-lin/UniversalPWA/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  GitHub Discussions
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/sponsors/julien-lin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors inline-flex items-center space-x-1"
                >
                  <FiHeart className="w-4 h-4 text-red-500" />
                  <span>Sponsor</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>{t.footer.copyright}</p>
        </div>
      </div>
    </footer>
  )
}

