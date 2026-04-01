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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Let onAuthStateChange handle everything — it fires for initial session too
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
