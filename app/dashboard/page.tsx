import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, slug, title, is_closed, created_at')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-dse-beige/60">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="font-display text-xl font-extrabold text-dse-teal">slam.fit</a>
          <span className="text-sm text-dse-beige-dark">{user.email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-2xl font-extrabold text-dse-navy mb-6">My sessions</h1>
        {(!sessions || sessions.length === 0) ? (
          <div className="text-center py-16">
            <p className="text-dse-beige-dark mb-4">You haven't created any sessions yet.</p>
            <Link href="/" className="rounded-xl bg-dse-teal px-6 py-3 text-sm font-semibold text-white hover:bg-dse-teal-dark transition">
              Create a session
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s: any) => (
              <li key={s.id}>
                <Link href={`/${s.slug}`}
                  className="flex items-center justify-between rounded-xl border border-dse-beige/60 px-5 py-4 hover:border-dse-teal transition">
                  <div>
                    <span className="font-semibold text-dse-navy">{s.title}</span>
                    <span className="ml-3 text-xs text-dse-beige-dark">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {s.is_closed && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/50">Closed</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
