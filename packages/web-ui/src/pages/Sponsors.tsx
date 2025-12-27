import { FiHeart, FiGithub, FiCheck } from 'react-icons/fi'
import { useTranslation } from '../hooks/useTranslation'

export function Sponsors() {
  const t = useTranslation()

  return (
    <div className="min-h-screen bg-white py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6" style={{ backgroundColor: '#f0fdfa' }}>
            <FiHeart className="w-8 h-8" style={{ color: '#45A596' }} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            {t.sponsors.title}
          </h1>
          <p className="text-lg text-gray-600">{t.sponsors.subtitle}</p>
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
          <p className="text-base text-gray-700 leading-relaxed mb-8">{t.sponsors.description}</p>

          {/* Benefits */}
          <div className="space-y-3 mb-8">
            {t.sponsors.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start space-x-3">
                <FiCheck className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#45A596' }} />
                <p className="text-gray-700 text-sm">{benefit}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <a
              href="https://github.com/sponsors/julien-lin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 text-white font-medium rounded-lg transition-colors duration-200"
              style={{ backgroundColor: '#45A596' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d8f82'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#45A596'}
            >
              <FiGithub className="mr-2 w-4 h-4" />
              {t.sponsors.cta}
            </a>
          </div>
        </div>

        {/* GitHub Sponsors Embed */}
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 text-center">
            {t.sponsorsPage.ourSponsors}
          </h2>
          <p className="text-gray-600 text-center mb-6 text-sm">
            {t.sponsorsPage.thankYou}
          </p>
          <div className="text-center">
            <a
              href="https://github.com/sponsors/julien-lin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center font-medium transition-colors duration-200"
              style={{ color: '#45A596' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#3d8f82'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#45A596'}
            >
              <FiGithub className="mr-2 w-4 h-4" />
              {t.sponsorsPage.viewOnGitHub}
            </a>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>
            {t.sponsorsPage.questions} {t.sponsorsPage.contactVia}{' '}
            <a
              href="https://github.com/julien-lin/UniversalPWA/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium transition-colors duration-200"
              style={{ color: '#45A596' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#3d8f82'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#45A596'}
            >
              {t.sponsorsPage.githubDiscussions}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

