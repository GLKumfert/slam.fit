export type ShiftGroup = {
  label: {
    id: string
    name: string
    color: string | null
    startTime: string
    endTime: string
    sortOrder: number
  } | null
  slots: {
    id: string
    startTime: string
    endTime: string
    labelId: string | null
  }[]
}

export function groupSlotsByShift(
  slots: { id: string; startTime: string; endTime: string; labelId: string | null }[],
  shiftLabels: {
    id: string
    name: string
    color: string | null
    startTime: string
    endTime: string
    sortOrder: number
  }[],
): ShiftGroup[] {
  const labelMap = new Map(shiftLabels.map((l) => [l.id, l]))
  const groups: ShiftGroup[] = []
  let currentLabelId: string | null | undefined = undefined
  let currentSlots: typeof slots = []

  for (const slot of slots) {
    if (slot.labelId !== currentLabelId) {
      if (currentSlots.length > 0) {
        groups.push({
          label: currentLabelId ? (labelMap.get(currentLabelId) ?? null) : null,
          slots: currentSlots,
        })
      }
      currentLabelId = slot.labelId
      currentSlots = [slot]
    } else {
      currentSlots.push(slot)
    }
  }

  if (currentSlots.length > 0) {
    groups.push({
      label: currentLabelId ? (labelMap.get(currentLabelId) ?? null) : null,
      slots: currentSlots,
    })
  }

  return groups
}
