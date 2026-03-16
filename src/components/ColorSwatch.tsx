import { ralToHex } from '../lib/ralColors'

interface ColorSwatchProps {
  color: string | null | undefined
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

export default function ColorSwatch({ color, size = 'md', className = '' }: ColorSwatchProps) {
  const hex = ralToHex(color)
  if (!hex) return null

  const isLight = isLightColor(hex)

  return (
    <span
      className={`inline-block rounded-full border ${isLight ? 'border-gray-300' : 'border-transparent'} ${sizes[size]} ${className}`}
      style={{ backgroundColor: hex }}
      title={color ?? ''}
    />
  )
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 200
}
