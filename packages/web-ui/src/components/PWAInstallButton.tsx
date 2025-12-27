import { FiDownload } from 'react-icons/fi'
import { usePWAInstall } from '../hooks/usePWAInstall'

interface PWAInstallButtonProps {
  className?: string
  variant?: 'default' | 'minimal'
  showIcon?: boolean
  children?: React.ReactNode
}

/**
 * Composant bouton d'installation PWA
 * 
 * S'affiche automatiquement uniquement si l'app est installable et non installée.
 * 
 * @example
 * ```tsx
 * <PWAInstallButton />
 * 
 * // Avec style personnalisé
 * <PWAInstallButton 
 *   variant="minimal" 
 *   className="my-custom-class"
 * />
 * ```
 */
export function PWAInstallButton({ 
  className = '', 
  variant = 'default',
  showIcon = true,
  children 
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, install } = usePWAInstall()

  // Ne pas afficher si déjà installée ou non installable
  if (isInstalled || !isInstallable) {
    return null
  }

  const defaultContent = (
    <>
      {showIcon && <FiDownload className="w-4 h-4 mr-2" />}
      Installer l'app
    </>
  )

  if (variant === 'minimal') {
    return (
      <button
        onClick={install}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${className}`}
        style={{ 
          color: '#45A596',
          backgroundColor: 'transparent',
          border: '1px solid #45A596'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f0fdfa'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        {children || defaultContent}
      </button>
    )
  }

  return (
    <button
      onClick={install}
      className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${className}`}
      style={{
        backgroundColor: '#45A596',
        color: 'white',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#2C736B'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#45A596'
      }}
    >
      {children || defaultContent}
    </button>
  )
}

