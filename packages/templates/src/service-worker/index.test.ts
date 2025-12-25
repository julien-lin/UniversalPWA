import { describe, it, expect } from 'vitest'
import {
  getServiceWorkerTemplate,
  getAvailableTemplateTypes,
  determineTemplateType,
  type ServiceWorkerTemplateType,
} from './index'

describe('service-worker templates', () => {
  describe('getServiceWorkerTemplate', () => {
    it('should return static template', () => {
      const template = getServiceWorkerTemplate('static')

      expect(template.type).toBe('static')
      expect(template.content).toContain('importScripts')
      expect(template.content).toContain('workbox.precaching.precacheAndRoute')
      expect(template.content).toContain('workbox.strategies.CacheFirst')
      expect(template.content).toContain('workbox.strategies.NetworkFirst')
    })

    it('should return spa template', () => {
      const template = getServiceWorkerTemplate('spa')

      expect(template.type).toBe('spa')
      expect(template.content).toContain('importScripts')
      expect(template.content).toContain('workbox.precaching.precacheAndRoute')
      expect(template.content).toContain('workbox.routing.NavigationRoute')
      expect(template.content).toContain('workbox.precaching.createHandlerBoundToURL')
    })

    it('should return ssr template', () => {
      const template = getServiceWorkerTemplate('ssr')

      expect(template.type).toBe('ssr')
      expect(template.content).toContain('importScripts')
      expect(template.content).toContain('workbox.precaching.precacheAndRoute')
      expect(template.content).toContain('workbox.strategies.NetworkFirst')
      expect(template.content).toContain('networkTimeoutSeconds')
    })

    it('should return wordpress template', () => {
      const template = getServiceWorkerTemplate('wordpress')

      expect(template.type).toBe('wordpress')
      expect(template.content).toContain('importScripts')
      expect(template.content).toContain('workbox.precaching.precacheAndRoute')
      expect(template.content).toContain('/wp-content/')
      expect(template.content).toContain('/wp-admin/')
      expect(template.content).toContain('/wp-json/')
    })

    it('should return php template', () => {
      const template = getServiceWorkerTemplate('php')

      expect(template.type).toBe('php')
      expect(template.content).toContain('importScripts')
      expect(template.content).toContain('workbox.precaching.precacheAndRoute')
      expect(template.content).toContain('/build/')
      expect(template.content).toContain('/public/')
    })

    it('should throw error for unknown type', () => {
      expect(() => getServiceWorkerTemplate('unknown' as ServiceWorkerTemplateType)).toThrow(
        'Unknown service worker template type',
      )
    })
  })

  describe('getAvailableTemplateTypes', () => {
    it('should return all available template types', () => {
      const types = getAvailableTemplateTypes()

      expect(types).toContain('static')
      expect(types).toContain('spa')
      expect(types).toContain('ssr')
      expect(types).toContain('wordpress')
      expect(types).toContain('php')
      expect(types).toHaveLength(5)
    })
  })

  describe('determineTemplateType', () => {
    it('should return wordpress for WordPress framework', () => {
      expect(determineTemplateType('ssr', 'WordPress')).toBe('wordpress')
      expect(determineTemplateType('spa', 'WordPress')).toBe('wordpress')
      expect(determineTemplateType('static', 'WordPress')).toBe('wordpress')
    })

    it('should return php for Symfony framework', () => {
      expect(determineTemplateType('ssr', 'Symfony')).toBe('php')
      expect(determineTemplateType('spa', 'Symfony')).toBe('php')
    })

    it('should return php for Laravel framework', () => {
      expect(determineTemplateType('ssr', 'Laravel')).toBe('php')
      expect(determineTemplateType('spa', 'Laravel')).toBe('php')
    })

    it('should return spa for spa architecture', () => {
      expect(determineTemplateType('spa', null)).toBe('spa')
      expect(determineTemplateType('spa', 'React')).toBe('spa')
    })

    it('should return ssr for ssr architecture', () => {
      expect(determineTemplateType('ssr', null)).toBe('ssr')
      expect(determineTemplateType('ssr', 'Next.js')).toBe('ssr')
    })

    it('should return static for static architecture', () => {
      expect(determineTemplateType('static', null)).toBe('static')
      expect(determineTemplateType('static', 'Static')).toBe('static')
    })

    it('should prioritize framework over architecture', () => {
      expect(determineTemplateType('spa', 'WordPress')).toBe('wordpress')
      expect(determineTemplateType('ssr', 'Symfony')).toBe('php')
    })
  })

  describe('template content validation', () => {
    it('should all templates use importScripts with Workbox CDN', () => {
      const types: ServiceWorkerTemplateType[] = ['static', 'spa', 'ssr', 'wordpress', 'php']

      types.forEach((type) => {
        const template = getServiceWorkerTemplate(type)
        expect(template.content).toContain('importScripts')
        expect(template.content).toContain('workbox-cdn/releases/7.4.0/workbox-sw.js')
        expect(template.content).toContain('typeof workbox !== \'undefined\'')
      })
    })

    it('should all templates contain precacheAndRoute', () => {
      const types: ServiceWorkerTemplateType[] = ['static', 'spa', 'ssr', 'wordpress', 'php']

      types.forEach((type) => {
        const template = getServiceWorkerTemplate(type)
        expect(template.content).toContain('workbox.precaching.precacheAndRoute')
      })
    })

    it('should spa template contain NavigationRoute', () => {
      const template = getServiceWorkerTemplate('spa')
      expect(template.content).toContain('workbox.routing.NavigationRoute')
      expect(template.content).toContain('workbox.precaching.createHandlerBoundToURL')
    })

    it('should wordpress template contain wp-specific routes', () => {
      const template = getServiceWorkerTemplate('wordpress')
      expect(template.content).toContain('/wp-content/')
      expect(template.content).toContain('/wp-admin/')
      expect(template.content).toContain('/wp-json/')
    })

    it('should php template contain build/public routes', () => {
      const template = getServiceWorkerTemplate('php')
      expect(template.content).toContain('/build/')
      expect(template.content).toContain('/public/')
    })
  })
})

