import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

// Prefetch zamówień — "rozgrzewa" Supabase i cache'uje dane
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
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function checkAllowed(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('allowed_users').select('email').eq('email', email).maybeSingle()
    if (error) { console.warn('allowed_users check failed, allowing access:', error.message); return true }
    return !!data
  } catch {
    return true // fallback: allow access if table doesn't exist
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const ok = await checkAllowed(session.user.email ?? '')
        if (!ok) {
          await supabase.auth.signOut()
          setDenied(true)
          setLoading(false)
          return
        }
        setUser(session.user)
        prefetchOrders()
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const ok = await checkAllowed(session.user.email ?? '')
        if (!ok) {
          await supabase.auth.signOut()
          setDenied(true)
          setUser(null)
          return
        }
        setDenied(false)
        setUser(session.user)
        prefetchOrders()
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
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
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, denied, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
