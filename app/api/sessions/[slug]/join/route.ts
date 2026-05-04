import { NextResponse } from 'next/server'
import type { TablesInsert } from '@/lib/database.types'
import { createServiceClient } from '@/lib/supabase/service'
import { joinSessionSchema } from '@/lib/validators/participant'

type Params = { slug?: string }

export async function POST(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const { slug } = await params
  if (!slug) {
    return NextResponse.json({ error: 'Missing session slug' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid request body',
        details: { formErrors: ['Malformed JSON'], fieldErrors: {} },
      },
      { status: 400 },
    )
  }

  const parsed = joinSessionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    )
  }

  const { name, roleIds, availableSlotIds } = parsed.data
  const uniqueRoleIds = [...new Set(roleIds)]
  const uniqueSlotIds = [...new Set(availableSlotIds)]

  const supabase = createServiceClient()

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, is_closed, roles_required')
    .eq('slug', slug)
    .maybeSingle()

  if (sessionError) {
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 },
    )
  }

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (session.is_closed) {
    return NextResponse.json(
      { error: 'This session is closed' },
      { status: 410 },
    )
  }

  if (session.roles_required && (!parsed.data.roleIds || parsed.data.roleIds.length === 0)) {
    return NextResponse.json(
      { error: 'This session requires you to select at least one role' },
      { status: 422 },
    )
  }

  const { data: existingParticipant, error: existingParticipantError } =
    await supabase
      .from('participants')
      .select('id')
      .eq('session_id', session.id)
      .eq('name', name)
      .maybeSingle()

  if (existingParticipantError) {
    return NextResponse.json(
      { error: 'Failed to check existing participant name' },
      { status: 500 },
    )
  }

  if (existingParticipant) {
    return NextResponse.json(
      { error: 'That name is already taken in this session' },
      { status: 409 },
    )
  }

  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('id')
    .eq('session_id', session.id)
    .in('id', uniqueRoleIds)

  if (rolesError) {
    return NextResponse.json(
      { error: 'Failed to validate roles' },
      { status: 500 },
    )
  }

  if ((roles ?? []).length !== uniqueRoleIds.length) {
    return NextResponse.json({ error: 'Invalid role IDs' }, { status: 400 })
  }

  const participantInsert: TablesInsert<'participants'> = {
    session_id: session.id,
    name,
  }

  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .insert(participantInsert)
    .select('id, token')
    .single()

  if (participantError) {
    return NextResponse.json(
      { error: 'Failed to create participant' },
      { status: 500 },
    )
  }

  const participantRoleRows: TablesInsert<'participant_roles'>[] =
    uniqueRoleIds.map((roleId) => ({
      participant_id: participant.id,
      role_id: roleId,
    }))

  const { error: participantRolesError } = await supabase
    .from('participant_roles')
    .insert(participantRoleRows)

  if (participantRolesError) {
    return NextResponse.json(
      { error: 'Failed to assign participant roles' },
      { status: 500 },
    )
  }

  if (uniqueSlotIds.length > 0) {
    const { data: slots, error: slotsError } = await supabase
      .from('time_slots')
      .select('id')
      .eq('session_id', session.id)
      .in('id', uniqueSlotIds)

    if (slotsError) {
      return NextResponse.json(
        { error: 'Failed to validate slot IDs' },
        { status: 500 },
      )
    }

    if ((slots ?? []).length !== uniqueSlotIds.length) {
      return NextResponse.json({ error: 'Invalid slot IDs' }, { status: 400 })
    }

    const availabilityRows: TablesInsert<'availabilities'>[] = uniqueSlotIds.map(
      (slotId) => ({
        participant_id: participant.id,
        time_slot_id: slotId,
      }),
    )

    const { error: availabilitiesError } = await supabase
      .from('availabilities')
      .insert(availabilityRows)

    if (availabilitiesError) {
      return NextResponse.json(
        { error: 'Failed to save participant availability' },
        { status: 500 },
      )
    }
  }

  return NextResponse.json(
    {
      participantId: participant.id,
      token: participant.token,
    },
    { status: 201 },
  )
}
