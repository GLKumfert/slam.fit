import type { ShiftLabelShape } from '@/app/[slug]/types'

interface ShiftTabProps {
  label: ShiftLabelShape
  slotIds: string[]
  cellHeight: number
  onClick: (slotIds: string[]) => void
  active: boolean
}

export default function ShiftTab({ label, slotIds, cellHeight, onClick, active }: ShiftTabProps) {
  const totalHeight = slotIds.length * cellHeight
  const tabColor = label.color ?? '#177072'

  return (
    <button
      type="button"
      onClick={() => onClick(slotIds)}
      title={label.name}
      style={{
        height: totalHeight,
        backgroundColor: active ? tabColor : tabColor + '40',
        borderColor: tabColor,
        width: 20,
      }}
      className="shrink-0 rounded-l border-l border-y flex items-center justify-center transition-colors hover:opacity-90 cursor-pointer"
      aria-label={`Toggle ${label.name} shift`}
    >
      <span
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          fontSize: 9,
          fontWeight: 600,
          color: active ? 'white' : tabColor,
          lineHeight: 1,
          maxHeight: totalHeight - 4,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        {label.name}
      </span>
    </button>
  )
}
