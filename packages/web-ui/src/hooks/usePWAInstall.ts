import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    installPWA?: () => Promise<{ outcome: 'accepted' | 'dismissed' }>
    isPWAInstalled?: () => boolean
    isPWAInstallable?: () => boolean
    deferredPrompt?: BeforeInstallPromptEvent
  }
}

export interface UsePWAInstallReturn {
  isInstallable: boolean
  isInstalled: boolean
  install: () => Promise<void>
}

/**
 * Hook React pour gérer l'installation PWA
 * 
 * @example
 * ```tsx
 * const { isInstallable, isInstalled, install } = usePWAInstall()
 * 
 * if (isInstallable && !isInstalled) {
 *   return <button onClick={install}>Installer l'app</button>
 * }
 * ```
 */
export function usePWAInstall(): UsePWAInstallReturn {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Vérifier si l'app est déjà installée
    const checkInstalled = () => {
      if (window.isPWAInstalled) {
        return window.isPWAInstalled()
      }
      // Fallback: vérifier le display-mode (si matchMedia est disponible)
      if (typeof window.matchMedia === 'function') {
        return (
          window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true
        )
      }
      // Si matchMedia n'est pas disponible (ex: environnement de test), retourner false
      return false
    }

    setIsInstalled(checkInstalled())

    // Vérifier si l'app est installable
    const checkInstallable = () => {
      if (window.isPWAInstallable) {
        return window.isPWAInstallable()
      }
      return false
    }

    setIsInstallable(checkInstallable())

    // Écouter l'événement personnalisé émis par le script injecté
    const handleInstallable = () => {
      setIsInstallable(true)
    }

    const handleInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
    }

    window.addEventListener('pwa-installable', handleInstallable)
    window.addEventListener('pwa-installed', handleInstalled)

    // Vérifier périodiquement (pour les cas où l'événement n'est pas capturé)
    const interval = setInterval(() => {
      setIsInstallable(checkInstallable())
      setIsInstalled(checkInstalled())
    }, 1000)

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable)
      window.removeEventListener('pwa-installed', handleInstalled)
      clearInterval(interval)
    }
  }, [])

  const install = async () => {
    if (!window.installPWA) {
      console.warn('PWA install function not available')
      return
    }

    try {
      await window.installPWA()
      setIsInstalled(true)
      setIsInstallable(false)
    } catch (error) {
      console.error('Failed to install PWA:', error)
    }
  }

  return {
    isInstallable,
    isInstalled,
    install,
  }
}

