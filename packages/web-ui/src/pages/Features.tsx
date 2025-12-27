import { useTranslation } from '../hooks/useTranslation'
import { IconRenderer } from '../components/IconRenderer'

export function Features() {
  const t = useTranslation()

  return (
    <div className="min-h-screen bg-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            {t.featuresPage.title}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t.features.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {t.features.items.map((feature, index) => (
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
              <p className="text-gray-600 leading-relaxed text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="inline-block p-10 rounded-2xl text-white max-w-2xl" style={{ backgroundColor: '#45A596' }}>
            <h2 className="text-2xl font-bold mb-3 text-white">{t.featuresPage.ctaTitle}</h2>
            <p className="mb-6 text-white/90 text-base">
              {t.featuresPage.ctaSubtitle}
            </p>
            <a
              href="https://www.npmjs.com/package/@julien-lin/universal-pwa-cli"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-white font-medium rounded-lg transition-colors duration-200"
              style={{ color: '#45A596' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdfa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              {t.featuresPage.ctaButton}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

