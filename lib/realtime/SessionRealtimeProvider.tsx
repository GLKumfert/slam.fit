'use client'
import { createContext, useContext, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type RefreshCallback = () => void

const RealtimeContext = createContext<{ onRefresh: (cb: RefreshCallback) => () => void } | null>(null)

interface SessionRealtimeProviderProps {
  sessionId: string
  children: React.ReactNode
  onUpdate: () => void
}

export function SessionRealtimeProvider({ sessionId, children, onUpdate }: SessionRealtimeProviderProps) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availabilities', filter: `participants.session_id=eq.${sessionId}` }, () => onUpdateRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` }, () => onUpdateRef.current())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  return <>{children}</>
}
