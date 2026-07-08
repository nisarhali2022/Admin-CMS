import { cn } from 'cms-core/utils'

export function Input({ className, type = 'text', ...props }) {
  return (
    <input
      type={type}
      className={cn(
        'h-9 w-full rounded-xl border border-[#d8dae0] bg-white px-3 text-[0.9rem] text-[#1f2330] outline-none transition focus:border-primary focus:ring-4 focus:ring-[#ebe4ff]',
        className,
      )}
      {...props}
    />
  )
}
