'use client'
import { useRef, useState } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { groupSlotsByShift, type ShiftGroup } from '@/lib/utils/shifts'
import ShiftTab from './ShiftTab'
import SlotTooltip from './SlotTooltip'
import type { TimeSlotShape, ShiftLabelShape, ParticipantShape } from '@/app/[slug]/types'
import { getHeatmapColor } from '@/lib/utils/heatmap'

const CELL_H = 28   // px — height of each time-slot row
const GAP_H  = 36   // px — height of a time-jump separator row

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

// Convert "HH:mm" → minutes since midnight for gap detection
function hhmm2min(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// Hatch background shared by top/bottom pads and gap separators
const HATCH_BG = 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.04), rgba(255,255,255,0.04) 3px, transparent 3px, transparent 9px)'
const HATCH_BORDER = { borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }

export default function AvailabilityGrid({
  timeSlots, shiftLabels, mode, selectedSlotIds, onSelectionChange,
  timezone, participants, selectedRoleIds, isPublic,
}: AvailabilityGridProps) {
  const days = groupByDay(timeSlots, timezone)

  const dragRef = useRef<{ toggling: boolean } | null>(null)
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

  const filteredParticipants = selectedRoleIds.length === 0
    ? participants
    : participants.filter(p => p.roles.some(r => selectedRoleIds.includes(r.id)))

  function getRatio(slotId: string): number {
    if (filteredParticipants.length === 0) return 0
    return filteredParticipants.filter(p => p.availableSlotIds.includes(slotId)).length / filteredParticipants.length
  }

  // ── Build the unified spine ──────────────────────────────────────────────
  // Collect unique time-of-day labels across all days, sorted midnight-first.
  const allTimeKeys = new Map<string, Date>() // "h:mm a" → representative UTC Date
  for (const [, daySlots] of days) {
    for (const slot of daySlots) {
      const label = formatInTimeZone(new Date(slot.startTime), timezone, 'h:mm a')
      if (!allTimeKeys.has(label)) allTimeKeys.set(label, new Date(slot.startTime))
    }
  }

  const sortedEntries = Array.from(allTimeKeys.entries()).sort(([, a], [, b]) => {
    const aHH = formatInTimeZone(a, timezone, 'HH:mm')
    const bHH = formatInTimeZone(b, timezone, 'HH:mm')
    return aHH.localeCompare(bHH)
  })
  const timeLabels = sortedEntries.map(([label]) => label)

  // Infer granularity from the first slot (ms)
  const granularityMs = timeSlots[0]
    ? new Date(timeSlots[0].endTime).getTime() - new Date(timeSlots[0].startTime).getTime()
    : 30 * 60 * 1000
  const granularityMin = granularityMs / 60000

  // Detect which spine indices are followed by a time jump > one granularity step.
  // "gapAfterIdx[i]" means there's a visible time jump between timeLabels[i] and [i+1].
  const gapAfterIdx = new Set<number>()
  for (let i = 0; i < sortedEntries.length - 1; i++) {
    const aMin = hhmm2min(formatInTimeZone(sortedEntries[i][1], timezone, 'HH:mm'))
    const bMin = hhmm2min(formatInTimeZone(sortedEntries[i + 1][1], timezone, 'HH:mm'))
    // Handle midnight wrap: if b < a in minutes, add 24h
    const diff = bMin >= aMin ? bMin - aMin : bMin + 24 * 60 - aMin
    if (diff > granularityMin) gapAfterIdx.add(i)
  }

  // Helper: end-time label for a given start-time entry
  function endTimeLabel(entry: [string, Date]): string {
    return formatInTimeZone(new Date(entry[1].getTime() + granularityMs), timezone, 'h:mm a')
  }

  // labelIndex maps "h:mm a" → spine index
  const labelIndex = new Map(timeLabels.map((l, i) => [l, i]))

  // ── paddedDays ───────────────────────────────────────────────────────────
  type PaddedSlot = TimeSlotShape | null
  const paddedDays: [string, PaddedSlot[]][] = days.map(([dayKey, daySlots]) => {
    const row: PaddedSlot[] = Array(timeLabels.length).fill(null)
    for (const slot of daySlots) {
      const label = formatInTimeZone(new Date(slot.startTime), timezone, 'h:mm a')
      const idx = labelIndex.get(label)
      if (idx !== undefined) row[idx] = slot
    }
    return [dayKey, row]
  })

  // ── Shared cell renderer ─────────────────────────────────────────────────
  function renderCell(slot: TimeSlotShape) {
    const selected = selectedSlotIds.has(slot.id)
    let bg = 'bg-dse-beige/30'
    if (mode === 'input') {
      bg = selected ? 'bg-dse-teal' : 'bg-dse-beige/30 hover:bg-dse-teal/30'
    }
    const isFiltering = selectedSlotIds.size > 0
    const inlineStyle = mode === 'heatmap'
      ? {
          backgroundColor: getHeatmapColor(getRatio(slot.id)),
          opacity: isFiltering && !selected ? 0.3 : 1,
          border: selected ? '2px solid white' : '1px solid rgba(255,255,255,0.6)',
        }
      : {}
    return (
      <div
        key={slot.id}
        style={{ height: CELL_H, width: 36, ...inlineStyle }}
        className={`border border-white/60 cursor-pointer transition-colors ${mode === 'input' ? bg : ''}`}
        onMouseDown={() => handleCellMouseDown(slot.id)}
        onMouseEnter={(e) => handleCellMouseEnter(e, slot.id)}
        onMouseLeave={() => setHovered(null)}
        onTouchStart={(e) => { e.preventDefault(); handleCellMouseDown(slot.id); dragRef.current = null }}
      />
    )
  }

  // ── Hatch block shared renderer ──────────────────────────────────────────
  function hatchBlock(heightPx: number) {
    return (
      <div style={{ height: heightPx, width: 56, background: HATCH_BG, ...HATCH_BORDER }} className="shrink-0" />
    )
  }

  // ── Gap separator shared renderer ────────────────────────────────────────
  // Used in BOTH label column and day columns so heights stay in sync.
  function gapSeparator(endLabel: string, startLabel: string, isLabelCol = false) {
    return (
      <div
        style={{ height: GAP_H, minHeight: GAP_H }}
        className="flex flex-col items-end justify-between px-1 py-0.5 shrink-0"
      >
        <span className="text-[9px] font-medium text-white/30 whitespace-nowrap">{endLabel}</span>
        {isLabelCol && <div className="w-full border-t border-dashed border-white/10 mx-auto" style={{ width: '60%' }} />}
        {startLabel && <span className="text-[9px] font-medium text-white/30 whitespace-nowrap">{startLabel}</span>}
      </div>
    )
  }

  // ── For each day, compute which spine-index ranges are "real" vs "pad" ───
  // We split topPad / bottomPad at gap boundaries so matching gap rows appear.
  function getDaySegments(paddedSlots: PaddedSlot[]): Array<
    | { type: 'hatch'; count: number }   // count spine rows of hatch
    | { type: 'groups'; groups: ShiftGroup[] }
    | { type: 'gap'; endLabel: string; startLabel: string }
  > {
    const realSlots = paddedSlots.filter((s): s is TimeSlotShape => s !== null)
    const groups: ShiftGroup[] = groupSlotsByShift(realSlots, shiftLabels)
    if (realSlots.length === 0) {
      // All hatch — insert gaps at same positions as spine
      const segments: ReturnType<typeof getDaySegments> = []
      let prev = 0
      for (const g of Array.from(gapAfterIdx).sort((a, b) => a - b)) {
        segments.push({ type: 'hatch', count: g - prev + 1 })
        segments.push({ type: 'gap', endLabel: endTimeLabel(sortedEntries[g]), startLabel: timeLabels[g + 1] ?? '' })
        prev = g + 1
      }
      segments.push({ type: 'hatch', count: timeLabels.length - prev })
      return segments
    }

    const firstIdx = labelIndex.get(formatInTimeZone(new Date(realSlots[0].startTime), timezone, 'h:mm a')) ?? 0
    const lastIdx  = labelIndex.get(formatInTimeZone(new Date(realSlots[realSlots.length - 1].startTime), timezone, 'h:mm a')) ?? 0

    const segments: ReturnType<typeof getDaySegments> = []

    // ① Top hatch (before first real slot), with any gaps that fall within it
    if (firstIdx > 0) {
      let prev = 0
      for (const g of Array.from(gapAfterIdx).sort((a, b) => a - b)) {
        if (g >= firstIdx) break
        if (g - prev + 1 > 0) segments.push({ type: 'hatch', count: g - prev + 1 })
        segments.push({ type: 'gap', endLabel: endTimeLabel(sortedEntries[g]), startLabel: timeLabels[g + 1] ?? '' })
        prev = g + 1
      }
      const remaining = firstIdx - prev
      if (remaining > 0) segments.push({ type: 'hatch', count: remaining })
    }

    // ② Real slot groups — also detect gaps WITHIN a group (same label, non-contiguous)
    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi]

      // Split this group at any internal spine gaps
      let subStart = 0
      for (let si = 1; si < group.slots.length; si++) {
        const prevLabel = formatInTimeZone(new Date(group.slots[si - 1].startTime), timezone, 'h:mm a')
        const prevSpineIdx = labelIndex.get(prevLabel) ?? 0
        if (gapAfterIdx.has(prevSpineIdx)) {
          // Push sub-group up to si-1, then gap
          segments.push({ type: 'groups', groups: [{ label: group.label, slots: group.slots.slice(subStart, si) }] })
          segments.push({ type: 'gap', endLabel: endTimeLabel(sortedEntries[prevSpineIdx]), startLabel: timeLabels[prevSpineIdx + 1] ?? '' })
          subStart = si
        }
      }
      // Push remaining sub-group (or whole group if no internal gaps)
      segments.push({ type: 'groups', groups: [{ label: group.label, slots: group.slots.slice(subStart) }] })

      // Check gap between this group and the next group
      if (gi < groups.length - 1) {
        const lastSlot = group.slots[group.slots.length - 1]
        const lastLabel = formatInTimeZone(new Date(lastSlot.startTime), timezone, 'h:mm a')
        const lastSpineIdx = labelIndex.get(lastLabel) ?? 0
        if (gapAfterIdx.has(lastSpineIdx)) {
          segments.push({ type: 'gap', endLabel: endTimeLabel(sortedEntries[lastSpineIdx]), startLabel: timeLabels[lastSpineIdx + 1] ?? '' })
        }
      }
    }

    // ③ Bottom hatch (after last real slot), with any gaps that fall within it
    if (lastIdx < timeLabels.length - 1) {
      let prev = lastIdx + 1
      for (const g of Array.from(gapAfterIdx).sort((a, b) => a - b)) {
        if (g < lastIdx) continue
        if (g - prev + 1 > 0) segments.push({ type: 'hatch', count: g - prev + 1 })
        segments.push({ type: 'gap', endLabel: endTimeLabel(sortedEntries[g]), startLabel: timeLabels[g + 1] ?? '' })
        prev = g + 1
      }
      const remaining = timeLabels.length - prev
      if (remaining > 0) segments.push({ type: 'hatch', count: remaining })
    }

    return segments
  }

  return (
    <div className="flex flex-col w-full">
      <div
        className="overflow-x-auto select-none pb-4"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex min-w-max lg:justify-center w-full px-4">

          {/* ── Time label column ── */}
          <div className="flex flex-col mr-2 shrink-0">
            <div style={{ height: 32 }} /> {/* header spacer */}
            {timeLabels.map((label, i) => (
              <>
                {/* Label top-aligned to the start of the slot box */}
                <div
                  key={`lbl-${i}`}
                  style={{ height: CELL_H }}
                  className="flex items-start justify-end pr-2 pt-0.5 text-xs font-medium text-dse-beige-dark whitespace-nowrap"
                >
                  {label}
                </div>

                {/* Gap separator after this label if spine jumps here */}
                {gapAfterIdx.has(i) && (
                  <div key={`gap-${i}`} style={{ height: GAP_H }} className="flex flex-col items-end justify-between pr-2 py-0.5 shrink-0">
                    <span className="text-[9px] font-medium text-white/30 whitespace-nowrap">
                      {endTimeLabel(sortedEntries[i])}
                    </span>
                    <div style={{ width: '100%', borderTop: '1px dashed rgba(255,255,255,0.12)' }} />
                    <span className="text-[9px] font-medium text-white/30 whitespace-nowrap">
                      {timeLabels[i + 1]}
                    </span>
                  </div>
                )}
              </>
            ))}

            {/* End time after the very last slot */}
            {sortedEntries.length > 0 && (
              <div className="flex items-start justify-end pr-2 pt-0.5 text-[9px] font-medium text-white/30 whitespace-nowrap" style={{ height: 16 }}>
                {endTimeLabel(sortedEntries[sortedEntries.length - 1])}
              </div>
            )}
          </div>

          {/* ── Day columns ── */}
          {paddedDays.map(([dayKey, paddedSlots]) => {
            const dayLabel = formatInTimeZone(new Date(dayKey + 'T12:00:00'), timezone, 'EEE M/d')
            const segments = getDaySegments(paddedSlots)

            return (
              <div key={dayKey} className="flex flex-col mr-3">
                {/* Day header */}
                <div style={{ height: 32 }}
                  className="flex items-center justify-center text-sm font-semibold text-dse-beige whitespace-nowrap px-2">
                  {dayLabel}
                </div>

                {segments.map((seg, si) => {
                  if (seg.type === 'hatch') {
                    return <div key={si}>{hatchBlock(seg.count * CELL_H)}</div>
                  }
                  if (seg.type === 'gap') {
                    // Thin dashed separator — same height as label column gap row
                    return (
                      <div key={si} style={{ height: GAP_H, width: 56 }}
                        className="shrink-0 flex items-center">
                        <div style={{ width: '100%', borderTop: '1px dashed rgba(255,255,255,0.1)' }} />
                      </div>
                    )
                  }
                  // type === 'groups'
                  return (
                    <div key={si}>
                      {seg.groups.map((group, gi) => (
                        <div key={gi} className="flex">
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
                          <div className="flex flex-col">
                            {group.slots.map(slot => renderCell(slot))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}

                {/* End-time spacer — aligns with label column's final end-time row */}
                <div style={{ height: 16 }} />
              </div>
            )
          })}

        </div>

        {/* Tooltip */}
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
              <div key={i} className="flex-1 h-full"
                style={{ backgroundColor: getHeatmapColor(i / filteredParticipants.length) }} />
            ))}
          </div>
          <span className="text-xs font-semibold text-white/80">{filteredParticipants.length}/{filteredParticipants.length}</span>
        </div>
      )}
    </div>
  )
}
