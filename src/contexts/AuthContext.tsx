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
    if (error) { console.warn('[auth] allowed_users error:', error.message, '→ allowing'); return { allowed: true, admin: false } }
    console.log('[auth] checkAllowed:', email, '→', data ? 'found' : 'NOT FOUND', data?.role)
    return { allowed: !!data, admin: data?.role === 'admin' }
  } catch (e) {
    console.warn('[auth] checkAllowed exception:', e); return { allowed: true, admin: false }
  }
}

// Clear all Supabase auth data from localStorage
function clearAuthStorage() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-'))
  keys.forEach(k => localStorage.removeItem(k))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let settled = false
    const settle = () => { if (!settled) { settled = true; setLoading(false) } }

    // Safety timeout — if auth takes longer than 5s, force stop loading
    const timeout = setTimeout(() => {
      if (!settled) {
        console.warn('Auth timeout — clearing stale session')
        clearAuthStorage()
        settle()
      }
    }, 5000)

    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          clearAuthStorage()
          await supabase.auth.signOut().catch(() => {})
          settle()
          return
        }
        if (session?.user) {
          const { allowed, admin } = await checkAllowed(session.user.email ?? '')
          if (!allowed) {
            await supabase.auth.signOut()
            setDenied(true)
            settle()
            return
          }
          setIsAdmin(admin)
          setUser(session.user)
          prefetchOrders()
        }
        settle()
      } catch {
        clearAuthStorage()
        await supabase.auth.signOut().catch(() => {})
        settle()
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) {
        setUser(null)
        settle()
        return
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setIsAdmin(false)
        settle()
        return
      }
      if (session?.user) {
        const { allowed, admin } = await checkAllowed(session.user.email ?? '')
        if (!allowed) {
          await supabase.auth.signOut()
          setDenied(true)
          setUser(null)
          return
        }
        setDenied(false)
        setIsAdmin(admin)
        setUser(session.user)
        settle()
        prefetchOrders()
      } else {
        setUser(null)
        settle()
      }
    })

    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    })
  }

  const signOut = async () => {
    clearAuthStorage()
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
