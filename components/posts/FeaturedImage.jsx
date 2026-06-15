import Image from 'next/image'
import { getFeaturedImageUrl, getFeaturedImageAlt, getCategoryColor, getFirstCategory } from '@/lib/utils'

export default function FeaturedImage({
  post,
  priority = false,
  fill = false,
  className = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 70vw, 800px',
}) {
  const src = getFeaturedImageUrl(post)
  const alt = getFeaturedImageAlt(post)
  const category = getFirstCategory(post)
  const fallbackColor = getCategoryColor(category?.slug || 'default')

  if (!src) {
    return (
      <div className={`${fallbackColor} flex items-center justify-center w-full h-full min-h-[200px] ${className}`}>
        <span className="text-white font-heading font-bold text-base px-4 text-center opacity-90">
          Telenor Quiz Today
        </span>
      </div>
    )
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        className={`object-cover ${className}`}
        sizes={sizes}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={450}
      priority={priority}
      className={`w-full h-auto object-cover ${className}`}
      sizes={sizes}
    />
  )
}
