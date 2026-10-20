import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ReservationStatus } from '@/types/api'

const STYLES: Record<ReservationStatus, string> = {
  Pending: 'bg-pending-soft text-pending',
  Confirmed: 'bg-confirmed-soft text-confirmed',
  Cancelled: 'bg-cancelled-soft text-cancelled',
}

export function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <Badge
      className={cn('px-2 font-semibold', STYLES[status] ?? 'bg-secondary text-muted-foreground')}
    >
      {status}
    </Badge>
  )
}
