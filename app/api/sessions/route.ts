import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createSessionSchema } from '@/lib/validators/session'
import { generateSlug } from '@/lib/utils/slug'
import { generateTimeSlots } from '@/lib/utils/dates'

export async function POST(req: Request) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSessionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  const data = parsed.data
  const supabase = createServiceClient()
  const serverSupabase = await createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  const slug = generateSlug(data.title)

  const { data: session, error: sessionErr } = await supabase
    .from('sessions')
    .insert({
      slug,
      title: data.title,
      description: data.description ?? null,
      timezone: data.timezone,
      is_public: data.isPublic,
      roles_required: data.rolesRequired,
      host_id: user?.id ?? null,
    })
    .select('id, slug, host_token')
    .single()

  if (sessionErr || !session) {
    console.error('session insert:', sessionErr)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }

  const { error: rolesErr } = await supabase.from('roles').insert(
    data.roles.map(r => ({ session_id: session.id, name: r.name, color: r.color }))
  )
  if (rolesErr) {
    console.error('roles insert:', rolesErr)
    return NextResponse.json({ error: 'Failed to create roles' }, { status: 500 })
  }

  type ShiftRef = { id: string; startMs: number; endMs: number }
  let shiftRefs: ShiftRef[] = []

  if (data.shiftLabels && data.shiftLabels.length > 0) {
    const { data: shifts, error: shiftsErr } = await supabase
      .from('shift_labels')
      .insert(data.shiftLabels.map((sl, i) => ({
        session_id: session.id,
        name: sl.name,
        color: sl.color ?? null,
        start_time: sl.startTime,
        end_time: sl.endTime,
        sort_order: i,
      })))
      .select('id, start_time, end_time')

    if (shiftsErr || !shifts) {
      console.error('shift_labels insert:', shiftsErr)
      return NextResponse.json({ error: 'Failed to create shift labels' }, { status: 500 })
    }

    shiftRefs = shifts.map(s => ({
      id: s.id,
      startMs: new Date(s.start_time).getTime(),
      endMs: new Date(s.end_time).getTime(),
    }))
  }

  const rawSlots = generateTimeSlots({
    dates: data.dates,
    timeRange: data.timeRange,
    granularity: data.granularity,
    timezone: data.timezone,
  })

  const slotRows = rawSlots.map(slot => {
    const startMs = slot.startTime.getTime()
    const match = shiftRefs.find(s => startMs >= s.startMs && startMs < s.endMs)
    return {
      session_id: session.id,
      label_id: match?.id ?? null,
      start_time: slot.startTime.toISOString(),
      end_time: slot.endTime.toISOString(),
    }
  })

  for (let i = 0; i < slotRows.length; i += 500) {
    const { error: slotsErr } = await supabase.from('time_slots').insert(slotRows.slice(i, i + 500))
    if (slotsErr) {
      console.error('time_slots insert:', slotsErr)
      return NextResponse.json({ error: 'Failed to create time slots' }, { status: 500 })
    }
  }

  return NextResponse.json({ slug: session.slug, hostToken: session.host_token }, { status: 201 })
}
