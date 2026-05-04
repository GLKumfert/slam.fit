import { NextResponse } from 'next/server'
import type { TablesInsert } from '@/lib/database.types'
import { createServiceClient } from '@/lib/supabase/service'
import { updateParticipantSchema } from '@/lib/validators/participant'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = updateParticipantSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed' }, { status: 422 })

  const { participantToken, name, roleIds, availableSlotIds } = parsed.data
  const supabase = createServiceClient()

  const { data: participant } = await supabase.from('participants').select('id, session_id').eq('token', participantToken).maybeSingle()
  if (!participant) return NextResponse.json({ error: 'Invalid participant token' }, { status: 403 })

  const { data: session } = await supabase.from('sessions').select('id, roles_required').eq('slug', slug).eq('id', participant.session_id).maybeSingle()
  if (!session) return NextResponse.json({ error: 'Invalid participant token' }, { status: 403 })

  if (session.roles_required && roleIds.length === 0) {
    return NextResponse.json({ error: 'This session requires you to select at least one role' }, { status: 422 })
  }

  // Check unique name conflict
  const { data: existingName } = await supabase.from('participants').select('id').eq('session_id', session.id).eq('name', name).neq('id', participant.id).maybeSingle()
  if (existingName) return NextResponse.json({ error: 'That name is already taken in this session' }, { status: 409 })

  // Update name
  await supabase.from('participants').update({ name }).eq('id', participant.id)

  // Replace roles
  await supabase.from('participant_roles').delete().eq('participant_id', participant.id)
  if (roleIds.length > 0) {
    await supabase.from('participant_roles').insert(roleIds.map(rid => ({ participant_id: participant.id, role_id: rid })))
  }

  // Replace availabilities
  await supabase.from('availabilities').delete().eq('participant_id', participant.id)
  if (availableSlotIds.length > 0) {
    await supabase.from('availabilities').insert(
      availableSlotIds.map((slotId: string) => ({ participant_id: participant.id, time_slot_id: slotId }))
    )
  }

  return NextResponse.json({ success: true })
}
