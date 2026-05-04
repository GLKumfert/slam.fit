import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params
  const hostToken = req.headers.get('x-host-token')
  if (!hostToken) return NextResponse.json({ error: 'Missing host token' }, { status: 403 })

  const supabase = createServiceClient()
  const { data: session } = await supabase.from('sessions').select('id, host_token').eq('slug', slug).maybeSingle()
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.host_token !== hostToken) return NextResponse.json({ error: 'Invalid host token' }, { status: 403 })

  await supabase.from('participants').delete().eq('id', id).eq('session_id', session.id)
  return NextResponse.json({ success: true })
}
