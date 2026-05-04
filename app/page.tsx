'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import SessionForm from '@/components/SessionForm'
import Footer from '@/components/Footer'

export default function LandingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function handleAuth() {
    if (!email || !password) return
    setLoading(true)
    const supabase = createClient()
    if (authMode === 'login') {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password })
      if (error) toast.error(error.message)
      else {
        toast.success('Logged in successfully!')
        setUser(data.user)
      }
    } else {
      const { error, data } = await supabase.auth.signUp({ email, password })
      if (error) toast.error(error.message)
      else {
        toast.success('Account created! You are logged in.')
        if (data.user) setUser(data.user)
      }
    }
    setLoading(false)
  }

  function handleSuccess(slug: string, hostToken: string) {
    router.push(`/${slug}?host=${hostToken}`)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <span className="font-display text-xl font-extrabold text-dse-beige">slam.fit</span>
          <div className="flex items-center gap-3">
            {user ? (
              <a href="/dashboard" className="text-sm font-medium text-amber-500 hover:text-amber-400 transition">
                My sessions
              </a>
            ) : (
              <form onSubmit={e => { e.preventDefault(); handleAuth(); }} className="flex items-center gap-2">
                <div className="flex gap-2">
                  <input value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="Email" type="email" required
                    className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-amber-500 w-32 sm:w-40" />
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Password" type="password" required
                    className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-amber-500 w-32 sm:w-40" />
                </div>
                <div className="flex flex-col items-start justify-center">
                  <button type="submit" disabled={loading}
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-[#18252D] hover:bg-amber-400 disabled:opacity-60 transition w-full">
                    {loading ? '…' : (authMode === 'login' ? 'Log in' : 'Sign up')}
                  </button>
                  <button type="button" onClick={() => setAuthMode(m => m === 'login' ? 'signup' : 'login')} className="text-[10px] text-white/50 hover:text-white transition whitespace-nowrap mt-1 mx-auto">
                    {authMode === 'login' ? 'Create account' : 'Have account?'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-2xl px-6 py-12">
          <div className="mb-8 text-center">
            <h1 className="font-display text-4xl font-extrabold text-white mb-3">
              Schedule your crew.
            </h1>
            <p className="text-dse-beige text-lg opacity-80">
              Role-aware availability scheduling for broadcast teams.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm sm:p-8">
            <SessionForm onSuccess={handleSuccess} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
