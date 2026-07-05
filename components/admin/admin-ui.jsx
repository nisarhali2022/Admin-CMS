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
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#646970]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-[1.45rem] font-semibold leading-tight text-[#1d2327]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-4xl text-sm leading-6 text-[#50575e]">
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
        'rounded-sm border border-[#c3c4c7] bg-white shadow-none ring-0 [--card-spacing:--spacing(4)]',
        className,
      )}
    >
      {(title || description || action) ? (
        <CardHeader className="rounded-none border-b border-[#dcdcde] bg-[#f6f7f7] px-4 py-3">
          <CardTitle className="text-sm font-semibold text-[#1d2327]">{title}</CardTitle>
          {description ? (
            <CardDescription className="text-xs leading-5 text-[#646970]">
              {description}
            </CardDescription>
          ) : null}
          {action ? <CardAction>{action}</CardAction> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn('px-4 py-4', contentClassName)}>{children}</CardContent>
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
        'rounded-sm px-2 py-0 text-[0.68rem] font-semibold uppercase tracking-[0.08em]',
        active
          ? 'bg-[#00a32a] text-white hover:bg-[#00a32a]'
          : 'bg-[#dcdcde] text-[#50575e]',
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
        'flex items-start gap-2 border-l-4 bg-white px-3 py-2 text-sm shadow-sm',
        isError
          ? 'border-red-600 text-red-800'
          : 'border-sky-600 text-[#1d2327]',
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
        'border border-dashed border-[#c3c4c7] bg-[#f6f7f7] px-4 py-8 text-center',
        className,
      )}
    >
      <p className="font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="space-y-3 border border-[#c3c4c7] bg-white p-4">
      <div className="flex items-center gap-2 text-sm text-[#50575e]">
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
      {label ? <Label className="text-xs font-semibold text-[#1d2327]">{label}</Label> : null}
      {children}
      {hint ? <p className="text-xs leading-5 text-[#646970]">{hint}</p> : null}
    </div>
  )
}
