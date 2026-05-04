import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('title, description')
    .eq('slug', slug)
    .maybeSingle()

  const title = session?.title ?? 'slam.fit session'
  const description = session?.description ?? 'Role-aware scheduling for broadcast teams.'

  return new ImageResponse(
    <div
      style={{
        background: '#1C2C35',
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', justifyContent: 'center',
        padding: '80px',
      }}
    >
      <div style={{ color: '#177072', fontSize: 32, fontWeight: 800, marginBottom: 24 }}>
        slam.fit
      </div>
      <div style={{ color: '#F1DAB6', fontSize: 64, fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
        {title}
      </div>
      {description && (
        <div style={{ color: '#9B846D', fontSize: 28, maxWidth: 900 }}>
          {description}
        </div>
      )}
    </div>
  )
}
