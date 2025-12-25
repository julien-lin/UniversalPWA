import { Link } from 'react-router-dom'
import { FiArrowRight, FiZap, FiCode, FiDownload } from 'react-icons/fi'
import { useTranslation } from '../hooks/useTranslation'

export function Home() {
  const t = useTranslation()

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-teal-50 via-white to-indigo-50 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <img
                src="/logo.png"
                alt="UniversalPWA - PWA Generator and Converter Tool Logo"
                className="h-24 w-24 md:h-32 md:w-32 object-contain drop-shadow-lg"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Transform Any Web Project into a PWA - UniversalPWA Generator
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              The easiest way to convert any web project into a Progressive Web App (PWA). Supports React, Vue, Angular, Next.js, Nuxt, WordPress, Symfony, Laravel, and more. Zero-config PWA generator with automatic framework detection.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://www.npmjs.com/package/@julien-lin/universal-pwa-cli"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-3 bg-teal-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:bg-teal-500 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <FiDownload className="mr-2" />
                {t.hero.cta}
              </a>
              <Link
                to="/features"
                className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-200 hover:border-teal-600 hover:text-teal-600 hover:bg-teal-50 transition-all duration-200"
              >
                {t.hero.ctaSecondary}
                <FiArrowRight className="ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How to Create a PWA in 3 Simple Steps
            </h2>
            <p className="text-xl text-gray-600">Transform your web project into a Progressive Web App with UniversalPWA - the fastest PWA generator available</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg bg-gray-50">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiDownload className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">1. Install</h3>
              <code className="block bg-gray-900 text-green-400 p-3 rounded text-sm">
                npm install -g @julien-lin/universal-pwa-cli
              </code>
            </div>
            <div className="text-center p-6 rounded-lg bg-gray-50">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiZap className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">2. Initialize</h3>
              <code className="block bg-gray-900 text-green-400 p-3 rounded text-sm">
                universal-pwa init
              </code>
            </div>
            <div className="text-center p-6 rounded-lg bg-gray-50">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCode className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">3. Deploy</h3>
              <p className="text-gray-600">Your PWA is ready to deploy!</p>
            </div>
          </div>
        </div>
      </section>

      {/* What is PWA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What is a PWA? Understanding Progressive Web Apps
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Learn what Progressive Web Apps (PWA) are and why they're the future of web development. Discover how PWAs combine the best of web and mobile apps.
            </p>
          </div>

          <div className="mb-12 max-w-4xl mx-auto">
            <p className="text-lg text-gray-700 leading-relaxed text-center mb-8">
              A Progressive Web App (PWA) is a web application that uses modern web capabilities to provide a native app-like experience. PWAs are installable, work offline, are fast, and provide an engaging user experience. They combine the reach of the web with the functionality of native applications, making them the perfect solution for businesses looking to provide a seamless experience across all devices.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {t.whatIsPWA.benefits.map((benefit, index) => (
              <div
                key={index}
                className="p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-teal-200"
              >
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              UniversalPWA Features - Complete PWA Solution
            </h2>
            <p className="text-xl text-gray-600">Everything you need to create, optimize, and deploy Progressive Web Apps across all frameworks</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.features.items.slice(0, 3).map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-100"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              to="/features"
              className="inline-flex items-center text-teal-600 hover:text-teal-700 font-semibold"
            >
              View All Features
              <FiArrowRight className="ml-2" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

