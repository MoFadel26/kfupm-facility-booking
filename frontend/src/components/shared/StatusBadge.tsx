import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ReservationStatus } from '@/types/api'

interface StatusConfig {
  dotClass: string
  badgeClass: string
}

const STYLES: Record<ReservationStatus, StatusConfig> = {
  Pending: {
    dotClass: 'bg-amber-500 animate-pulse',
    badgeClass:
      'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  },
  Confirmed: {
    dotClass: 'bg-emerald-600 dark:bg-emerald-400',
    badgeClass:
      'border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300',
  },
  Cancelled: {
    dotClass: 'bg-rose-500',
    badgeClass:
      'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300',
  },
}

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const config = STYLES[status] ?? {
    dotClass: 'bg-muted-foreground',
    badgeClass: 'border-border bg-muted text-muted-foreground',
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-tight shadow-2xs transition-colors',
        config.badgeClass,
      )}
    >
      <span className={cn('size-1.5 rounded-full shrink-0', config.dotClass)} aria-hidden="true" />
      {status}
    </Badge>
  )
}
