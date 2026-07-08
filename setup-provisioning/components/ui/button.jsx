import { cn } from 'cms-core/utils'

const variants = {
  default: 'border-primary bg-primary text-white hover:bg-[#5025d1]',
  outline: 'border-[#d8dae0] bg-white text-[#1f2330] hover:bg-[#f5f3ff]',
  destructive: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
}

const sizes = {
  default: 'h-9 px-4 text-[0.9rem]',
  sm: 'h-8 px-3 text-[0.84rem]',
}

export function Button({
  className,
  variant = 'default',
  size = 'default',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      data-slot="button"
      data-variant={variant}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full border font-semibold transition disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4',
        variants[variant] || variants.default,
        sizes[size] || sizes.default,
        className,
      )}
      {...props}
    />
  )
}
