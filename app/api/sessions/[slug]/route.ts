import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SessionPageData, ParticipantShape } from '@/app/[slug]/types'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: session, error: sessionErr } = await supabase
    .from('sessions')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (sessionErr) return NextResponse.json({ error: 'DB error' }, { status: 500 })
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const [timeSlotsRes, rolesRes, shiftLabelsRes, participantsRes, availabilitiesRes] =
    await Promise.all([
      supabase.from('time_slots').select('*').eq('session_id', session.id).order('start_time'),
      supabase.from('roles').select('*').eq('session_id', session.id),
      supabase.from('shift_labels').select('*').eq('session_id', session.id).order('sort_order'),
      supabase.from('participants').select('*, participant_roles(role_id, roles(*))').eq('session_id', session.id),
      supabase.from('availabilities').select('participant_id, time_slot_id, participants!inner(session_id)').eq('participants.session_id', session.id),
    ])

  if (timeSlotsRes.error || rolesRes.error || shiftLabelsRes.error || participantsRes.error || availabilitiesRes.error) {
    return NextResponse.json({ error: 'Failed to fetch session data' }, { status: 500 })
  }

  const slotsByParticipant = new Map<string, string[]>()
  for (const av of availabilitiesRes.data ?? []) {
    const existing = slotsByParticipant.get(av.participant_id) ?? []
    slotsByParticipant.set(av.participant_id, [...existing, av.time_slot_id])
  }

  const participants: ParticipantShape[] = (participantsRes.data ?? []).map(p => {
    const roleEntries = (p.participant_roles as Array<{ role_id: string; roles: { id: string; name: string; color: string } | null }>) ?? []
    return {
      id: p.id,
      name: p.name,
      roles: roleEntries.filter(pr => pr.roles !== null).map(pr => ({ id: pr.roles!.id, name: pr.roles!.name, color: pr.roles!.color })),
      availableSlotIds: slotsByParticipant.get(p.id) ?? [],
      createdAt: p.created_at,
    }
  })

  const response: SessionPageData = {
    session: {
      id: session.id, slug: session.slug, title: session.title,
      description: session.description, timezone: session.timezone,
      isPublic: session.is_public, isClosed: session.is_closed,
      rolesRequired: session.roles_required, createdAt: session.created_at,
    },
    timeSlots: (timeSlotsRes.data ?? []).map(ts => ({ id: ts.id, startTime: ts.start_time, endTime: ts.end_time, labelId: ts.label_id })),
    shiftLabels: (shiftLabelsRes.data ?? []).map(sl => ({ id: sl.id, name: sl.name, color: sl.color, startTime: sl.start_time, endTime: sl.end_time, sortOrder: sl.sort_order })),
    roles: (rolesRes.data ?? []).map(r => ({ id: r.id, name: r.name, color: r.color })),
    participants,
  }

  return NextResponse.json(response)
}
