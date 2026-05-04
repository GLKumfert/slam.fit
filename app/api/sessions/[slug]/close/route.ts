import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const hostToken = req.headers.get('x-host-token')
  if (!hostToken) return NextResponse.json({ error: 'Missing host token' }, { status: 403 })

  const supabase = createServiceClient()
  const { data: session } = await supabase.from('sessions').select('id, host_token').eq('slug', slug).maybeSingle()
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.host_token !== hostToken) return NextResponse.json({ error: 'Invalid host token' }, { status: 403 })

  await supabase.from('sessions').update({ is_closed: true }).eq('id', session.id)
  return NextResponse.json({ success: true })
}
