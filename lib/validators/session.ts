import { z } from 'zod'

const hexColor = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color')
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
const timeStr = z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM')

export const createSessionSchema = z.object({
  title:       z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  dates:       z.array(isoDate).min(1).max(60),
  timeRange:   z.object({ start: timeStr, end: timeStr }),
  granularity: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  timezone:    z.string().min(1),
  isPublic:    z.boolean().default(true),
  rolesRequired: z.boolean().default(false),
  roles: z.array(z.object({ name: z.string().min(1).max(30), color: hexColor }))
          .min(1).max(10),
  shiftLabels: z.array(z.object({
    name:      z.string().min(1).max(50),
    color:     hexColor.optional(),
    startTime: z.string().datetime(),
    endTime:   z.string().datetime(),
  })).optional(),
}).refine(d => d.timeRange.end > d.timeRange.start, {
  message: 'End time must be after start time',
  path: ['timeRange', 'end'],
})

export type CreateSessionInput = z.infer<typeof createSessionSchema>
