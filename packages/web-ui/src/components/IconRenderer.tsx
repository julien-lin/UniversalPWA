import {
  FiZap,
  FiSettings,
  FiSearch,
  FiMessageCircle,
  FiImage,
  FiSend,
  FiSmartphone,
  FiGlobe,
  FiShield,
  FiRefreshCw,
} from 'react-icons/fi'

export type IconName =
  | 'zap'
  | 'settings'
  | 'search'
  | 'message-circle'
  | 'image'
  | 'send'
  | 'smartphone'
  | 'globe'
  | 'shield'
  | 'refresh-cw'

interface IconRendererProps {
  name: IconName | string
  className?: string
  style?: React.CSSProperties
}

const iconMap: Record<IconName, React.ComponentType<{ className?: string }>> = {
  zap: FiZap,
  settings: FiSettings,
  search: FiSearch,
  'message-circle': FiMessageCircle,
  image: FiImage,
  send: FiSend,
  smartphone: FiSmartphone,
  globe: FiGlobe,
  shield: FiShield,
  'refresh-cw': FiRefreshCw,
}

export function IconRenderer({ name, className = 'w-6 h-6 text-gray-700', style }: IconRendererProps) {
  if (!name || typeof name !== 'string') {
    return null
  }
  
  const iconName = name.trim() as IconName
  const IconComponent = iconMap[iconName]
  
  if (!IconComponent) {
    console.error(`Icon "${name}" not found in iconMap. Available icons:`, Object.keys(iconMap))
    return null
  }
  
  // Render the icon component with style wrapper if needed
  if (style) {
    return (
      <span style={style}>
        <IconComponent className={className} />
      </span>
    )
  }
  
  return <IconComponent className={className} />
}

