import RoleBadge from './RoleBadge'
import type { ParticipantShape } from '@/app/[slug]/types'

interface SlotTooltipProps {
  slotId: string
  participants: ParticipantShape[]
  isPublic: boolean
  style?: React.CSSProperties
}

export default function SlotTooltip({ slotId, participants, isPublic, style }: SlotTooltipProps) {
  const available = participants.filter(p => p.availableSlotIds.includes(slotId))
  if (available.length === 0) return null

  return (
    <div
      style={style}
      className="absolute z-50 rounded-xl bg-dse-navy text-white shadow-lg p-3 min-w-[160px] max-w-[220px] pointer-events-none"
    >
      <p className="text-xs font-semibold mb-2 text-dse-beige">{available.length} available</p>
      {isPublic && (
        <ul className="space-y-1.5">
          {available.map(p => (
            <li key={p.id} className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-white font-medium">{p.name}</span>
              {p.roles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.roles.map(r => <RoleBadge key={r.id} name={r.name} color={r.color} size="sm" />)}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
