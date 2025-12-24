import { FiHeart, FiGithub, FiCheck } from 'react-icons/fi'
import { useTranslation } from '../hooks/useTranslation'

export function Sponsors() {
  const t = useTranslation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <FiHeart className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t.sponsors.title}
          </h1>
          <p className="text-xl text-gray-600 mb-2">{t.sponsors.subtitle}</p>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <p className="text-lg text-gray-700 leading-relaxed mb-6">{t.sponsors.description}</p>

          {/* Benefits */}
          <div className="space-y-4 mb-8">
            {t.sponsors.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start space-x-3">
                <FiCheck className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700">{benefit}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <a
              href="https://github.com/sponsors/julien-lin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <FiGithub className="mr-2" />
              {t.sponsors.cta}
            </a>
          </div>
        </div>

        {/* GitHub Sponsors Embed */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            Our Sponsors
          </h2>
          <p className="text-gray-600 text-center mb-6">
            Thank you to everyone who supports UniversalPWA!
          </p>
          <div className="text-center">
            <a
              href="https://github.com/sponsors/julien-lin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
            >
              <FiGithub className="mr-2" />
              View on GitHub Sponsors
            </a>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center text-gray-600">
          <p>
            Questions about sponsoring? Contact us via{' '}
            <a
              href="https://github.com/julien-lin/UniversalPWA/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              GitHub Discussions
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

