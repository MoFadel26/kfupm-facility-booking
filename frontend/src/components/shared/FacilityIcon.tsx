import {
  BarbellIcon,
  BasketballIcon,
  BuildingIcon,
  ChalkboardTeacherIcon,
  FlaskIcon,
  SwimmingPoolIcon,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import type { FacilityType } from '@/types/api'

const ICONS: Record<FacilityType, Icon> = {
  Classroom: ChalkboardTeacherIcon,
  Laboratory: FlaskIcon,
  SwimmingPool: SwimmingPoolIcon,
  SportsCourt: BasketballIcon,
  Gym: BarbellIcon,
  Other: BuildingIcon,
}

export function FacilityIcon({ type, className }: { type: FacilityType; className?: string }) {
  const Glyph = ICONS[type] ?? BuildingIcon
  return <Glyph weight="fill" aria-hidden="true" className={className} />
}
