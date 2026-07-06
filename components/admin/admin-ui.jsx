import { AlertCircle, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[#7c8490]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-[1.55rem] font-bold leading-tight text-[#1f2330]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-4xl text-[0.96rem] leading-6 text-[#596171]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}

export function AdminPanel({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}) {
  return (
    <Card
      className={cn(
        'overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_8px_24px_rgba(31,35,48,0.04)] ring-0 [--card-spacing:--spacing(4)]',
        className,
      )}
    >
      {(title || description || action) ? (
        <CardHeader className="border-b border-[#edf0f3] bg-white px-5 py-4">
          <CardTitle className="text-[1rem] font-bold text-[#1f2330]">{title}</CardTitle>
          {description ? (
            <CardDescription className="text-[0.86rem] leading-5 text-[#6b7280]">
              {description}
            </CardDescription>
          ) : null}
          {action ? <CardAction>{action}</CardAction> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn('px-5 py-5', contentClassName)}>{children}</CardContent>
    </Card>
  )
}

export function SectionSurface({ children, className }) {
  return (
    <section className={cn('space-y-5', className)}>
      {children}
    </section>
  )
}

export function StatusBadge({ active, children }) {
  return (
    <Badge
      variant={active ? 'default' : 'secondary'}
      className={cn(
        'rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold uppercase tracking-[0.06em]',
        active
          ? 'bg-[#00b090] text-white hover:bg-[#00b090]'
          : 'bg-[#eef0f4] text-[#596171]',
      )}
    >
      {children || (active ? 'Active' : 'Inactive')}
    </Badge>
  )
}

export function MessageAlert({ message, tone = 'error', className }) {
  if (!message) return null

  const isError = tone === 'error'

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-xl border px-4 py-3 text-[0.94rem] shadow-sm',
        isError
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-[#d8ccff] bg-[#f5f3ff] text-[#2f1c6a]',
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function EmptyState({ title, description, action, className }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-[#d8dae0] bg-white px-5 py-10 text-center shadow-[0_8px_24px_rgba(31,35,48,0.03)]',
        className,
      )}
    >
      <p className="font-bold text-[#1f2330]">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-[0.95rem] leading-6 text-[#6b7280]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="space-y-3 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_8px_24px_rgba(31,35,48,0.03)]">
      <div className="flex items-center gap-2 text-[0.95rem] text-[#596171]">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-4/5" />
    </div>
  )
}

export function Field({ label, children, hint, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? <Label className="text-[0.86rem] font-bold text-[#1f2330]">{label}</Label> : null}
      {children}
      {hint ? <p className="text-[0.82rem] leading-5 text-[#6b7280]">{hint}</p> : null}
    </div>
  )
}
