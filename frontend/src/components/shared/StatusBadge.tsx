import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ReservationStatus } from '@/types/api'

const STYLES: Record<ReservationStatus, string> = {
  Pending: 'border-amber-600/40 bg-amber-100/60 text-amber-800',
  Confirmed: 'border-primary/40 bg-primary/10 text-primary',
  Cancelled: 'border-destructive/30 bg-destructive/10 text-destructive',
}

export function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <Badge variant="outline" className={cn('font-mono text-[11px]', STYLES[status])}>
      {status}
    </Badge>
  )
}
