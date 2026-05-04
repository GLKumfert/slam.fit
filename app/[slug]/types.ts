export type SessionShape = {
  id: string
  slug: string
  title: string
  description: string | null
  timezone: string
  isPublic: boolean
  isClosed: boolean
  rolesRequired: boolean
  createdAt: string
}

export type RoleShape = {
  id: string
  name: string
  color: string
}

export type ShiftLabelShape = {
  id: string
  name: string
  color: string | null
  startTime: string
  endTime: string
  sortOrder: number
}

export type TimeSlotShape = {
  id: string
  startTime: string
  endTime: string
  labelId: string | null
}

export type ParticipantShape = {
  id: string
  name: string
  roles: RoleShape[]
  availableSlotIds: string[]
  createdAt: string
}

export type SessionPageData = {
  session: SessionShape
  timeSlots: TimeSlotShape[]
  shiftLabels: ShiftLabelShape[]
  roles: RoleShape[]
  participants: ParticipantShape[]
}
