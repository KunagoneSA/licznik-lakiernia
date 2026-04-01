import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

function prefetchOrders() {
  supabase
    .from('orders')
    .select('*, client:clients(name, type), order_items(total_price)')
    .order('number', { ascending: false })
    .then(({ data }) => {
      if (data) {
        try { localStorage.setItem('orders_cache', JSON.stringify(data)) } catch {}
      }
    })
}

interface AuthContextType {
  user: User | null
  loading: boolean
  denied: boolean
  isAdmin: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function checkAllowed(email: string): Promise<{ allowed: boolean; admin: boolean }> {
  try {
    const { data, error } = await supabase.from('allowed_users').select('email, role').eq('email', email).maybeSingle()
    if (error) return { allowed: true, admin: false }
    return { allowed: !!data, admin: data?.role === 'admin' }
  } catch {
    return { allowed: true, admin: false }
  }
}

async function handleSession(
  session: { user: User } | null,
  setUser: (u: User | null) => void,
  setIsAdmin: (a: boolean) => void,
  setDenied: (d: boolean) => void,
  setLoading: (l: boolean) => void,
) {
  if (session?.user) {
    const { allowed, admin } = await checkAllowed(session.user.email ?? '')
    if (!allowed) {
      await supabase.auth.signOut()
      setDenied(true)
      setUser(null)
      setLoading(false)
      return
    }
    setDenied(false)
    setIsAdmin(admin)
    setUser(session.user)
    setLoading(false)
    prefetchOrders()
  } else {
    setUser(null)
    setIsAdmin(false)
    setLoading(false)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let handled = false

    // Primary: getSession (works always)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (handled) return
      handled = true
      if (error) { setLoading(false); return }
      handleSession(session, setUser, setIsAdmin, setDenied, setLoading)
    }).catch(() => {
      if (!handled) { handled = true; setLoading(false) }
    })

    // Secondary: listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!handled) { handled = true }
      handleSession(session, setUser, setIsAdmin, setDenied, setLoading)
    })

    // Safety: if nothing fires in 8s, stop loading
    const timeout = setTimeout(() => {
      if (!handled) { handled = true; setLoading(false) }
    }, 8000)

    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, denied, isAdmin, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
