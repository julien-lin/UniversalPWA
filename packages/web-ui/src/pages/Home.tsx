import { Link } from 'react-router-dom'
import { FiArrowRight, FiZap, FiCode, FiDownload } from 'react-icons/fi'
import { useTranslation } from '../hooks/useTranslation'
import { IconRenderer } from '../components/IconRenderer'

export function Home() {
  const t = useTranslation()

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-white py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-10">
              <img
                src="/logo.png"
                alt="UniversalPWA - PWA Generator and Converter Tool Logo"
                className="h-20 w-20 md:h-24 md:w-24 object-contain"
              />
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight">
              {t.hero.title}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              {t.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://www.npmjs.com/package/@julien-lin/universal-pwa-cli"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 text-white font-medium rounded-lg transition-colors duration-200"
                style={{ backgroundColor: '#45A596' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d8f82'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#45A596'}
              >
                <FiDownload className="mr-2 w-4 h-4" />
                {t.hero.cta}
              </a>
              <Link
                to="/features"
                className="inline-flex items-center justify-center px-6 py-3 bg-white font-medium rounded-lg border transition-all duration-200"
                style={{ borderColor: '#45A596', color: '#45A596' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0fdfa'
                  e.currentTarget.style.borderColor = '#3d8f82'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.borderColor = '#45A596'
                }}
              >
                {t.hero.ctaSecondary}
                <FiArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              {t.quickStart.title}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t.quickStart.subtitle}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="text-center p-8 bg-white rounded-xl border border-gray-200 transition-colors duration-200"
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#45A596'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: '#f0fdfa' }}>
                <FiDownload className="w-6 h-6" style={{ color: '#45A596' }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t.quickStart.step1}</h3>
              <code className="block bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono text-left overflow-x-auto">
                npm install -g @julien-lin/universal-pwa-cli
              </code>
            </div>
            <div className="text-center p-8 bg-white rounded-xl border border-gray-200 transition-colors duration-200"
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#45A596'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: '#f0fdfa' }}>
                <FiZap className="w-6 h-6" style={{ color: '#45A596' }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t.quickStart.step2}</h3>
              <code className="block bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono text-left overflow-x-auto">
                universal-pwa init
              </code>
            </div>
            <div className="text-center p-8 bg-white rounded-xl border border-gray-200 transition-colors duration-200"
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#45A596'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: '#f0fdfa' }}>
                <FiCode className="w-6 h-6" style={{ color: '#45A596' }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t.quickStart.step3}</h3>
              <p className="text-gray-600 text-sm">{t.quickStart.step3Description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* What is PWA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              {t.whatIsPWA.title}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t.whatIsPWA.subtitle}
            </p>
          </div>

          <div className="mb-16 max-w-3xl mx-auto">
            <p className="text-base text-gray-700 leading-relaxed text-center">
              {t.whatIsPWA.definition}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {t.whatIsPWA.benefits.map((benefit, index) => (
              <div
                key={index}
                className="p-6 bg-white rounded-xl border border-gray-200 transition-colors duration-200"
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#45A596'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: '#f0fdfa' }}>
                  <IconRenderer name={benefit.icon} className="w-6 h-6" style={{ color: '#45A596' }} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              {t.featuresPage.title}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t.features.subtitle}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {t.features.items.slice(0, 3).map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-white rounded-xl border border-gray-200 transition-colors duration-200"
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#45A596'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: '#f0fdfa' }}>
                  <IconRenderer name={feature.icon} className="w-6 h-6" style={{ color: '#45A596' }} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              to="/features"
              className="inline-flex items-center font-medium transition-colors duration-200"
                style={{ color: '#45A596' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#3d8f82'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#45A596'}
            >
              {t.nav.features}
              <FiArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

