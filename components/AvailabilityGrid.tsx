'use client'
import { useCallback, useRef, useState } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { groupSlotsByShift, type ShiftGroup } from '@/lib/utils/shifts'
import ShiftTab from './ShiftTab'
import SlotTooltip from './SlotTooltip'
import type { TimeSlotShape, ShiftLabelShape, ParticipantShape } from '@/app/[slug]/types'
import { getHeatmapColor } from '@/lib/utils/heatmap'

const CELL_H = 28  // px — height of each time slot row

interface AvailabilityGridProps {
  timeSlots: TimeSlotShape[]
  shiftLabels: ShiftLabelShape[]
  mode: 'input' | 'heatmap'
  selectedSlotIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  timezone: string
  sessionTimezone: string
  participants: ParticipantShape[]
  selectedRoleIds: string[]
  isPublic: boolean
}

// Group slots by calendar day in the display timezone
function groupByDay(slots: TimeSlotShape[], tz: string): [string, TimeSlotShape[]][] {
  const map = new Map<string, TimeSlotShape[]>()
  for (const slot of slots) {
    const key = formatInTimeZone(new Date(slot.startTime), tz, 'yyyy-MM-dd')
    const arr = map.get(key) ?? []
    arr.push(slot)
    map.set(key, arr)
  }
  return Array.from(map.entries())
}

export default function AvailabilityGrid({
  timeSlots, shiftLabels, mode, selectedSlotIds, onSelectionChange,
  timezone, participants, selectedRoleIds, isPublic,
}: AvailabilityGridProps) {
  const days = groupByDay(timeSlots, timezone)

  // Drag state for input mode
  const dragRef = useRef<{ toggling: boolean } | null>(null)
  
  // Hover state for tooltip
  const [hovered, setHovered] = useState<{ slotId: string; x: number; y: number } | null>(null)

  function handleCellMouseDown(slotId: string) {
    const next = new Set(selectedSlotIds)
    const toggling = !next.has(slotId)
    toggling ? next.add(slotId) : next.delete(slotId)
    onSelectionChange(next)
    dragRef.current = { toggling }
  }

  function handleCellMouseEnter(e: React.MouseEvent, slotId: string) {
    if (mode === 'heatmap') {
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      setHovered({ slotId, x: rect.right + 8, y: rect.top })
    }

    if (!dragRef.current) return
    // Only drag on non-touch
    if (window.matchMedia('(pointer: coarse)').matches) return
    
    const next = new Set(selectedSlotIds)
    dragRef.current.toggling ? next.add(slotId) : next.delete(slotId)
    onSelectionChange(next)
  }

  function handleMouseUp() { dragRef.current = null }

  function handleShiftTabClick(slotIds: string[]) {
    const next = new Set(selectedSlotIds)
    const allSelected = slotIds.every(id => next.has(id))
    slotIds.forEach(id => allSelected ? next.delete(id) : next.add(id))
    onSelectionChange(next)
  }

  // Heatmap: compute availability ratio per slot
  const filteredParticipants = selectedRoleIds.length === 0
    ? participants
    : participants.filter(p => p.roles.some(r => selectedRoleIds.includes(r.id)))

  function getRatio(slotId: string): number {
    if (filteredParticipants.length === 0) return 0
    const count = filteredParticipants.filter(p => p.availableSlotIds.includes(slotId)).length
    return count / filteredParticipants.length
  }

  // Unique time labels (for left column) — from first day's slots
  const timeLabels = days[0]?.[1].map(slot =>
    formatInTimeZone(new Date(slot.startTime), timezone, 'h:mm a')
  ) ?? []

  return (
    <div className="flex flex-col w-full">
      <div
        className="overflow-x-auto select-none pb-4"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex min-w-max lg:justify-center w-full px-4">
          {/* Time label column */}
          <div className="flex flex-col mr-2 shrink-0">
            <div style={{ height: 32 }} /> {/* spacer for day header */}
            {timeLabels.map((label, i) => (
              <div key={i} style={{ height: CELL_H }}
                className="flex items-center justify-end pr-2 text-xs font-medium text-dse-beige-dark whitespace-nowrap">
                {label}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(([dayKey, daySlots]) => {
            const groups: ShiftGroup[] = groupSlotsByShift(daySlots, shiftLabels)
            const dayLabel = formatInTimeZone(new Date(dayKey + 'T12:00:00'), timezone, 'EEE M/d')
            return (
              <div key={dayKey} className="flex flex-col mr-3">
                {/* Day header */}
                <div style={{ height: 32 }}
                  className="flex items-center justify-center text-sm font-semibold text-dse-beige whitespace-nowrap px-2">
                  {dayLabel}
                </div>

                {/* Shift groups */}
                {groups.map((group, gi) => (
                  <div key={gi} className="flex">
                    {/* Shift tab (if this group has a label) */}
                    {group.label ? (
                      <ShiftTab
                        label={group.label}
                        slotIds={group.slots.map(s => s.id)}
                        cellHeight={CELL_H}
                        onClick={handleShiftTabClick}
                        active={group.slots.every(s => selectedSlotIds.has(s.id))}
                      />
                    ) : (
                      <div style={{ width: 20 }} className="shrink-0" />
                    )}

                    {/* Cells */}
                    <div className="flex flex-col">
                      {group.slots.map(slot => {
                        const selected = selectedSlotIds.has(slot.id)
                        let bg = 'bg-dse-beige/30'
                        if (mode === 'input') {
                          bg = selected ? 'bg-dse-teal' : 'bg-dse-beige/30 hover:bg-dse-teal/30'
                        } else {
                          bg = ''  // will use inline style
                        }
                        const isFiltering = selectedSlotIds.size > 0
                        const inlineStyle = mode === 'heatmap'
                          ? { 
                              backgroundColor: getHeatmapColor(getRatio(slot.id)),
                              opacity: isFiltering && !selected ? 0.3 : 1,
                              border: selected ? '2px solid white' : '1px solid rgba(255,255,255,0.6)'
                            }
                          : {}
                        return (
                          <div
                            key={slot.id}
                            style={{ height: CELL_H, width: 36, ...inlineStyle }}
                            className={`border border-white/60 cursor-pointer transition-colors ${bg}`}
                            onMouseDown={() => handleCellMouseDown(slot.id)}
                            onMouseEnter={(e) => handleCellMouseEnter(e, slot.id)}
                            onMouseLeave={() => setHovered(null)}
                            onTouchStart={(e) => {
                              e.preventDefault()  // prevent scroll hijack
                              handleCellMouseDown(slot.id)
                              dragRef.current = null  // disable drag on touch
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
        
        {/* Tooltip render */}
        {hovered && mode === 'heatmap' && (
          <SlotTooltip
            slotId={hovered.slotId}
            participants={filteredParticipants}
            isPublic={isPublic}
            style={{ position: 'fixed', left: hovered.x, top: hovered.y }}
          />
        )}
      </div>

      {/* Legend */}
      {mode === 'heatmap' && filteredParticipants.length > 0 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <span className="text-xs font-semibold text-white/80">0/{filteredParticipants.length}</span>
          <div className="flex h-3 w-48 sm:w-64 rounded-sm overflow-hidden border border-white/20">
            {Array.from({ length: filteredParticipants.length + 1 }).map((_, i) => (
              <div 
                key={i} 
                className="flex-1 h-full" 
                style={{ backgroundColor: getHeatmapColor(i / filteredParticipants.length) }}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-white/80">{filteredParticipants.length}/{filteredParticipants.length}</span>
        </div>
      )}
    </div>
  )
}
