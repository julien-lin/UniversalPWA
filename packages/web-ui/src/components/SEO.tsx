import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from '../hooks/useTranslation'
import { useLanguage } from '../contexts/LanguageContext'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  image?: string
  type?: string
}

export function SEO({ title, description, keywords, image = '/logo.png', type = 'website' }: SEOProps) {
  const location = useLocation()
  const t = useTranslation()
  const { language } = useLanguage()

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://universal-pwa.com'
  const currentUrl = `${siteUrl}${location.pathname}`
  const pageTitle = title || t.hero.title
  const pageDescription = description || t.hero.subtitle
  const pageKeywords = keywords || 'PWA, Progressive Web App, PWA generator, PWA converter, transform to PWA, React PWA, Vue PWA, Angular PWA, WordPress PWA, Symfony PWA, Laravel PWA, service worker, web manifest, offline app, installable app'

  useEffect(() => {
    // Update document title
    document.title = `${pageTitle} | UniversalPWA - Transform Any Web Project into a PWA`

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, attribute: string = 'name') => {
      let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, name)
        document.head.appendChild(element)
      }
      element.setAttribute('content', content)
    }

    // Basic meta tags
    updateMetaTag('description', pageDescription)
    updateMetaTag('keywords', pageKeywords)
    updateMetaTag('author', 'UniversalPWA')
    updateMetaTag('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')

    // Open Graph tags
    updateMetaTag('og:title', pageTitle, 'property')
    updateMetaTag('og:description', pageDescription, 'property')
    updateMetaTag('og:image', `${siteUrl}${image}`, 'property')
    updateMetaTag('og:url', currentUrl, 'property')
    updateMetaTag('og:type', type, 'property')
    updateMetaTag('og:site_name', 'UniversalPWA', 'property')
    updateMetaTag('og:locale', language === 'fr' ? 'fr_FR' : language === 'es' ? 'es_ES' : 'en_US', 'property')

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image')
    updateMetaTag('twitter:title', pageTitle)
    updateMetaTag('twitter:description', pageDescription)
    updateMetaTag('twitter:image', `${siteUrl}${image}`)
    updateMetaTag('twitter:site', '@universalpwa') // TODO: Update with actual Twitter handle

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', currentUrl)

    // Language alternates
    const languages = ['en', 'fr', 'es']
    languages.forEach((lang) => {
      let hreflang = document.querySelector(`link[rel="alternate"][hreflang="${lang}"]`) as HTMLLinkElement
      if (!hreflang) {
        hreflang = document.createElement('link')
        hreflang.setAttribute('rel', 'alternate')
        hreflang.setAttribute('hreflang', lang)
        document.head.appendChild(hreflang)
      }
      hreflang.setAttribute('href', `${siteUrl}${location.pathname}?lang=${lang}`)
    })

    // Structured data (JSON-LD)
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'UniversalPWA',
      applicationCategory: 'WebApplication',
      operatingSystem: 'Web',
      description: pageDescription,
      url: siteUrl,
      author: {
        '@type': 'Organization',
        name: 'UniversalPWA',
        url: siteUrl,
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '5',
        ratingCount: '1',
      },
      keywords: pageKeywords,
      inLanguage: language,
      softwareVersion: '1.2.4',
      downloadUrl: 'https://www.npmjs.com/package/@julien-lin/universal-pwa-cli',
      screenshot: `${siteUrl}${image}`,
    }

    let script = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement
    if (!script) {
      script = document.createElement('script')
      script.setAttribute('type', 'application/ld+json')
      document.head.appendChild(script)
    }
    script.textContent = JSON.stringify(structuredData)
  }, [pageTitle, pageDescription, pageKeywords, image, type, currentUrl, language, location.pathname])

  return null
}

