import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import GridSkeleton from '@/components/GridSkeleton'
import SessionPageClient from './SessionPageClient'
import type { SessionPageData, ParticipantShape } from './types'

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="font-display text-2xl font-extrabold text-dse-navy">Session not found</h1>
        <p className="text-dse-beige-dark">This session doesn't exist or has been removed.</p>
        <Link href="/" className="inline-block rounded-lg bg-dse-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-dse-teal-dark transition">
          Create a new session
        </Link>
      </div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-dse-beige/20">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 space-y-2 animate-pulse">
          <div className="h-8 w-72 rounded-lg bg-dse-beige" />
          <div className="h-4 w-48 rounded bg-dse-beige/70" />
        </div>
        <GridSkeleton />
      </main>
    </div>
  )
}

async function SessionContent({ slug }: { slug: string }) {
  const supabase = await createClient()

  const { data: session, error } = await supabase
    .from('sessions').select('*').eq('slug', slug).maybeSingle()

  if (error) return <div className="p-8 text-center text-red-600">Failed to load session.</div>
  if (!session) return <NotFound />

  const [timeSlotsRes, rolesRes, shiftLabelsRes, participantsRes, availabilitiesRes] =
    await Promise.all([
      supabase.from('time_slots').select('*').eq('session_id', session.id).order('start_time'),
      supabase.from('roles').select('*').eq('session_id', session.id),
      supabase.from('shift_labels').select('*').eq('session_id', session.id).order('sort_order'),
      supabase.from('participants').select('*, participant_roles(role_id, roles(*))').eq('session_id', session.id),
      supabase.from('availabilities').select('participant_id, time_slot_id, participants!inner(session_id)').eq('participants.session_id', session.id),
    ])

  const slotsByParticipant = new Map<string, string[]>()
  for (const av of availabilitiesRes.data ?? []) {
    const arr = slotsByParticipant.get(av.participant_id) ?? []
    slotsByParticipant.set(av.participant_id, [...arr, av.time_slot_id])
  }

  const participants: ParticipantShape[] = (participantsRes.data ?? []).map(p => {
    const roleEntries = (p.participant_roles as Array<{ role_id: string; roles: { id: string; name: string; color: string } | null }>) ?? []
    return {
      id: p.id, name: p.name,
      roles: roleEntries.filter(pr => pr.roles !== null).map(pr => ({ id: pr.roles!.id, name: pr.roles!.name, color: pr.roles!.color })),
      availableSlotIds: slotsByParticipant.get(p.id) ?? [],
      createdAt: p.created_at,
    }
  })

  const pageData: SessionPageData = {
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

  return <SessionPageClient data={pageData} />
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SessionContent slug={slug} />
    </Suspense>
  )
}
