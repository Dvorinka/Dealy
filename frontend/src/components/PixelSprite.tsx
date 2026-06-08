import { cn } from '../lib/utils'

type PixelSpriteProps = {
  src: string
  alt?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  glow?: boolean
}

const sizeMap = {
  xs: 'w-4 h-4',
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
}

export default function PixelSprite({ src, alt = '', size = 'md', className, glow }: PixelSpriteProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        'pixel-art object-contain',
        sizeMap[size],
        glow && 'drop-shadow-[0_0_8px_rgba(45,106,45,0.6)]',
        className,
      )}
      draggable={false}
    />
  )
}
