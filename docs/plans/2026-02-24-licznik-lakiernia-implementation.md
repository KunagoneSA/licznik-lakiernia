# Licznik Lakiernia - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a database-backed web app replacing 192 Excel spreadsheets for paint shop order tracking, pricing, worker reports, and financial summaries.

**Architecture:** React 19 SPA with Supabase backend. Same patterns as kunagone-serwisy: AuthContext for Google OAuth, custom hooks for data fetching, AppLayout with sidebar navigation, dark theme. Supabase handles auth, database, realtime subscriptions, and RLS security.

**Tech Stack:** React 19, Vite 7, TypeScript 5.9, Tailwind CSS 4, Supabase (PostgreSQL + Auth + Realtime + RLS), GitHub Pages, PWA via vite-plugin-pwa, lucide-react icons, react-router-dom v7.

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `eslint.config.js`
- Create: `index.html`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `src/vite-env.d.ts`
- Create: `public/icons/icon-192.svg`
- Create: `public/icons/icon-512.svg`

**Step 1: Initialize project with Vite**

```bash
cd /home/artur/claude-projects/licznik-lakiernia
npm create vite@latest . -- --template react-ts
```

If prompted about existing files, overwrite. This gives us the base scaffold.

**Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @tailwindcss/vite tailwindcss lucide-react react-router-dom
npm install -D vite-plugin-pwa @testing-library/jest-dom @testing-library/react @testing-library/user-event jsdom vitest
```

**Step 3: Configure vite.config.ts**

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Licznik Lakiernia',
        short_name: 'Lakiernia',
        description: 'System zarządzania zamówieniami lakierni',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
```

**Step 4: Configure TypeScript**

`tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.tsx", "src/**/*.test.ts", "src/test"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": ["node"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

**Step 5: Configure ESLint**

`eslint.config.js`:
```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
```

**Step 6: Set up index.html**

```html
<!doctype html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/icons/icon-192.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0f172a" />
    <meta name="description" content="System zarządzania zamówieniami lakierni" />
    <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
    <title>Licznik Lakiernia</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 7: Set up source files**

`src/index.css`:
```css
@import "tailwindcss";
```

`src/main.tsx`:
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx`:
```typescript
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

export default function App() {
  return <RouterProvider router={router} />
}
```

`src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest'
```

`.env.example`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

`.gitignore`:
```
logs
*.log
npm-debug.log*
node_modules
dist
dist-ssr
*.local
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
.worktrees/
```

**Step 8: Update package.json scripts**

Ensure `scripts` section has:
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build && cp dist/index.html dist/404.html",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

**Step 9: Create PWA icons**

Create `public/icons/icon-192.svg` — a paint roller icon in amber/slate colors:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" fill="none">
  <rect width="192" height="192" rx="40" fill="#f59e0b"/>
  <path d="M48 56h80a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8V64a8 8 0 0 1 8-8z" fill="#0f172a"/>
  <path d="M136 72h16v12h-16z" fill="#0f172a"/>
  <path d="M152 72v40a8 8 0 0 1-8 8h-36" fill="none" stroke="#0f172a" stroke-width="8" stroke-linecap="round"/>
  <rect x="88" y="112" width="16" height="40" rx="4" fill="#0f172a"/>
</svg>
```

Copy the same as `public/icons/icon-512.svg`.

**Step 10: Verify build**

```bash
cd /home/artur/claude-projects/licznik-lakiernia
npm run build
```

Expected: Build succeeds (will fail on missing router.tsx — that's ok, we'll create it in Task 2).

**Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold project with Vite, React 19, TypeScript, Tailwind CSS 4, PWA"
```

---

## Task 2: Supabase Client + Auth + Router Shell

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/types/database.ts`
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/components/ErrorBoundary.tsx`
- Create: `src/components/ProtectedRoute.tsx`
- Create: `src/layouts/RootLayout.tsx`
- Create: `src/layouts/AppLayout.tsx`
- Create: `src/pages/LoginPage.tsx`
- Create: `src/pages/DashboardPage.tsx`
- Create: `src/router.tsx`

**Step 1: Create Supabase client**

`src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'test-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Step 2: Create TypeScript types**

`src/types/database.ts`:
```typescript
export type OrderStatus = 'nowe' | 'w_trakcie' | 'gotowe' | 'wydane' | 'zapłacone'
export type ClientType = 'individual' | 'company'

export interface Client {
  id: string
  name: string
  type: ClientType
  contact_info: string | null
  access_code: string | null
  created_at: string
}

export interface PaintingVariant {
  id: string
  name: string
  default_price_per_m2: number
  sides: number
}

export interface ClientPricing {
  id: string
  client_id: string
  variant_id: string
  price_per_m2: number
}

export interface Order {
  id: string
  number: number
  client_id: string
  description: string | null
  status: OrderStatus
  planned_date: string | null
  ready_date: string | null
  material_provided: boolean
  paints_provided: boolean
  dimensions_entered: boolean
  notes: string | null
  created_at: string
  created_by: string | null
  // joined
  client?: Client
}

export interface OrderItem {
  id: string
  order_id: string
  length_mm: number
  width_mm: number
  quantity: number
  variant_id: string
  has_handle: boolean
  notes: string | null
  m2: number
  price_per_m2: number
  total_price: number
  // joined
  variant?: PaintingVariant
}

export interface WorkLog {
  id: string
  order_id: string | null
  worker_name: string
  operation: string
  date: string
  hours: number
  hourly_rate: number
  cost: number
  m2_painted: number | null
  created_at: string
}

export interface MonthlyCost {
  id: string
  month: string
  rent: number
  waste: number
  other: number
  total: number
}

export interface PaintPurchase {
  id: string
  date: string
  supplier: string
  product: string
  quantity: number
  unit: string
  unit_price: number
  total: number
  order_id: string | null
}
```

**Step 3: Create AuthContext**

`src/contexts/AuthContext.tsx`:
```typescript
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
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
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

**Step 4: Create ErrorBoundary**

`src/components/ErrorBoundary.tsx`:
```typescript
import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[300px] items-center justify-center p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
              <AlertTriangle className="h-7 w-7 text-red-600" />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-slate-900">Coś poszło nie tak</h2>
            <p className="mt-1 text-sm text-slate-500">
              {this.state.error?.message ?? 'Wystąpił nieoczekiwany błąd.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
```

**Step 5: Create ProtectedRoute**

`src/components/ProtectedRoute.tsx`:
```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-amber-500" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}
```

**Step 6: Create layouts**

`src/layouts/RootLayout.tsx`:
```typescript
import { Outlet } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import ErrorBoundary from '../components/ErrorBoundary'

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </ErrorBoundary>
  )
}
```

`src/layouts/AppLayout.tsx`:
```typescript
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Users, BarChart3, Paintbrush, ShoppingCart, Menu, X } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tablica' },
  { to: '/zamowienia', icon: ClipboardList, label: 'Zamówienia' },
  { to: '/raport', icon: BarChart3, label: 'Raport pracowników' },
  { to: '/finanse', icon: BarChart3, label: 'Finanse' },
  { to: '/klienci', icon: Users, label: 'Klienci i cenniki' },
  { to: '/lakiery', icon: ShoppingCart, label: 'Zakupy lakierów' },
] as const

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const renderNavLink = (
    { to, icon: Icon, label }: typeof navItems[number],
    onClick?: () => void
  ) => (
    <NavLink
      key={to}
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-slate-800 text-amber-400'
            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
        }`
      }
    >
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </NavLink>
  )

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-slate-800 bg-slate-950">
        <div className="flex h-14 items-center gap-2 px-5 border-b border-slate-800">
          <div className="h-7 w-7 rounded-md bg-amber-500 flex items-center justify-center">
            <Paintbrush className="h-4 w-4 text-slate-900" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
            Lakiernia
          </span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => renderNavLink(item))}
        </nav>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 transform transition-transform duration-200 ease-out md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-14 items-center justify-between px-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-amber-500 flex items-center justify-center">
              <Paintbrush className="h-4 w-4 text-slate-900" />
            </div>
            <span className="text-sm font-semibold tracking-wide text-slate-100 uppercase">Lakiernia</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="py-4 px-3 space-y-1">
          {navItems.map((item) => renderNavLink(item, () => setMobileOpen(false)))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 md:hidden">
          <button onClick={() => setMobileOpen(true)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold tracking-wide text-slate-100 uppercase">Lakiernia</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

**Step 7: Create LoginPage**

`src/pages/LoginPage.tsx`:
```typescript
import { Navigate } from 'react-router-dom'
import { Paintbrush } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-amber-500" />
      </div>
    )
  }

  if (user) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500">
            <Paintbrush className="h-7 w-7 text-slate-900" />
          </div>
          <h1 className="text-xl font-bold tracking-wide text-slate-100 uppercase">Licznik Lakiernia</h1>
          <p className="mt-1 text-sm text-slate-500">System zarządzania zamówieniami</p>
        </div>
        <div className="rounded-xl border border-slate-800 p-6">
          <button
            onClick={signInWithGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 active:bg-slate-200"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Zaloguj się kontem Google
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 8: Create placeholder DashboardPage**

`src/pages/DashboardPage.tsx`:
```typescript
export default function DashboardPage() {
  return (
    <div className="text-slate-100">
      <h1 className="text-2xl font-bold">Tablica zamówień</h1>
      <p className="mt-2 text-slate-400">Dashboard w budowie...</p>
    </div>
  )
}
```

**Step 9: Create router**

`src/router.tsx`:
```typescript
import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import AppLayout from './layouts/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <DashboardPage /> },
        ],
      },
    ],
  },
])
```

**Step 10: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 11: Commit**

```bash
git add -A
git commit -m "feat: add Supabase client, auth context, router, layouts, login page"
```

---

## Task 3: Supabase Project + Database Schema

**Files:**
- Create: `supabase/schema.sql` (reference only — executed via Supabase API)

**Step 1: Create Supabase project**

Use Supabase Management API to create a new project under the existing organization. Use access token `<SUPABASE_ACCESS_TOKEN>`.

```bash
# List orgs to get org_id
curl -s -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" \
  https://api.supabase.com/v1/organizations | jq '.[0].id'

# Create project
curl -s -X POST -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  https://api.supabase.com/v1/projects \
  -d '{
    "organization_id": "<org_id>",
    "name": "licznik-lakiernia",
    "db_pass": "<generate-a-strong-password>",
    "region": "eu-central-1",
    "plan": "free"
  }'
```

Wait for project to be ready. Get project ref and API keys.

**Step 2: Execute SQL schema**

Run via Supabase SQL Editor API or dashboard. Full schema:

```sql
-- Enums
CREATE TYPE client_type AS ENUM ('individual', 'company');
CREATE TYPE order_status AS ENUM ('nowe', 'w_trakcie', 'gotowe', 'wydane', 'zapłacone');

-- Clients
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type client_type NOT NULL DEFAULT 'individual',
  contact_info text,
  access_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Painting variants
CREATE TABLE painting_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  default_price_per_m2 decimal NOT NULL DEFAULT 0,
  sides integer NOT NULL DEFAULT 2
);

-- Client-specific pricing
CREATE TABLE client_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES painting_variants(id) ON DELETE CASCADE,
  price_per_m2 decimal NOT NULL,
  UNIQUE(client_id, variant_id)
);

-- Orders
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number serial UNIQUE,
  client_id uuid NOT NULL REFERENCES clients(id),
  description text,
  status order_status NOT NULL DEFAULT 'nowe',
  planned_date date,
  ready_date date,
  material_provided boolean NOT NULL DEFAULT false,
  paints_provided boolean NOT NULL DEFAULT false,
  dimensions_entered boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Order items (elements)
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  length_mm integer NOT NULL,
  width_mm integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  variant_id uuid NOT NULL REFERENCES painting_variants(id),
  has_handle boolean NOT NULL DEFAULT false,
  notes text,
  m2 decimal NOT NULL DEFAULT 0,
  price_per_m2 decimal NOT NULL DEFAULT 0,
  total_price decimal NOT NULL DEFAULT 0
);

-- Work logs
CREATE TABLE work_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  worker_name text NOT NULL,
  operation text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  hours decimal NOT NULL,
  hourly_rate decimal NOT NULL,
  cost decimal NOT NULL DEFAULT 0,
  m2_painted decimal,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Monthly fixed costs
CREATE TABLE monthly_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL UNIQUE,
  rent decimal NOT NULL DEFAULT 0,
  waste decimal NOT NULL DEFAULT 0,
  other decimal NOT NULL DEFAULT 0,
  total decimal NOT NULL DEFAULT 0
);

-- Paint purchases
CREATE TABLE paint_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  supplier text NOT NULL,
  product text NOT NULL,
  quantity decimal NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  unit_price decimal NOT NULL,
  total decimal NOT NULL DEFAULT 0,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_orders_client ON orders(client_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_work_logs_order ON work_logs(order_id);
CREATE INDEX idx_work_logs_date ON work_logs(date);
CREATE INDEX idx_work_logs_worker ON work_logs(worker_name);
CREATE INDEX idx_paint_purchases_date ON paint_purchases(date);
CREATE INDEX idx_client_pricing_client ON client_pricing(client_id);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE painting_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE paint_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated users can do everything (admin-only for now, refine later)
CREATE POLICY "Authenticated users full access" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON painting_variants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON client_pricing FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON work_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON monthly_costs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON paint_purchases FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
```

**Step 3: Seed initial painting variants**

```sql
INSERT INTO painting_variants (name, default_price_per_m2, sides) VALUES
  ('Frezowane 2str', 450, 2),
  ('Frezowane 1str', 350, 1),
  ('Gładkie 2str', 250, 2),
  ('Gładkie 1str', 200, 1),
  ('Fornir 2 przejścia', 130, 2),
  ('Fornir 1 przejście', 100, 1);
```

**Step 4: Configure Google OAuth in Supabase**

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  "https://api.supabase.com/v1/projects/<project-ref>/config/auth" \
  -d '{
    "external_google_enabled": true,
    "external_google_client_id": "<GOOGLE_CLIENT_ID>",
    "external_google_secret": "<GOOGLE_CLIENT_SECRET>",
    "site_url": "<DEPLOY_URL>",
    "uri_allow_list": "<DEPLOY_URL>/**,http://localhost:5173/**"
  }'
```

**Step 5: Update .env.local with real keys**

```bash
echo "VITE_SUPABASE_URL=https://<project-ref>.supabase.co" > .env.local
echo "VITE_SUPABASE_ANON_KEY=<anon-key>" >> .env.local
```

**Step 6: Commit schema file**

```bash
git add supabase/schema.sql
git commit -m "feat: add Supabase database schema with all tables, indexes, RLS"
```

---

## Task 4: GitHub Repo + GitHub Pages Deployment

**Files:**
- Create: `.github/workflows/deploy.yml`

**Step 1: Create GitHub repo**

```bash
gh repo create KunagoneSA/licznik-lakiernia --public --source=. --push
```

**Step 2: Create deploy workflow**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master, main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Step 3: Set GitHub secrets**

```bash
gh secret set VITE_SUPABASE_URL --repo KunagoneSA/licznik-lakiernia --body "https://<project-ref>.supabase.co"
gh secret set VITE_SUPABASE_ANON_KEY --repo KunagoneSA/licznik-lakiernia --body "<anon-key>"
```

**Step 4: Enable GitHub Pages**

```bash
gh api repos/KunagoneSA/licznik-lakiernia/pages -X POST -f build_type=workflow
```

**Step 5: Commit and push**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Pages deployment workflow"
git push
```

**Step 6: Verify deployment**

Wait for GitHub Actions to complete, then check the deployed URL. The app should show the login page.

---

## Task 5: Dashboard — Kanban Board

**Files:**
- Create: `src/hooks/useOrders.ts`
- Modify: `src/pages/DashboardPage.tsx`
- Create: `src/components/OrderCard.tsx`
- Create: `src/components/KanbanColumn.tsx`
- Create: `src/components/DashboardStats.tsx`

**Step 1: Create useOrders hook**

`src/hooks/useOrders.ts`:
```typescript
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Order } from '../types/database'

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('orders')
      .select('*, client:clients(name)')
      .order('number', { ascending: false })

    if (err) {
      setError(err.message)
    } else {
      setOrders(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()

    // Realtime subscription
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetch()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  return { orders, loading, error, refetch: fetch }
}
```

**Step 2: Create OrderCard component**

`src/components/OrderCard.tsx`:
```typescript
import { Link } from 'react-router-dom'
import { Calendar, User } from 'lucide-react'
import type { Order } from '../types/database'

function getUrgencyColor(plannedDate: string | null, status: string): string {
  if (status === 'gotowe' || status === 'wydane' || status === 'zapłacone') return 'border-emerald-500'
  if (!plannedDate) return 'border-slate-600'
  const days = Math.ceil((new Date(plannedDate).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'border-red-500'
  if (days <= 3) return 'border-amber-500'
  return 'border-emerald-500'
}

export default function OrderCard({ order }: { order: Order }) {
  const clientName = (order as Record<string, unknown>).client
    ? ((order as Record<string, unknown>).client as { name: string }).name
    : '—'

  return (
    <Link
      to={`/zamowienia/${order.id}`}
      className={`block rounded-lg border-l-4 bg-slate-800 p-3 transition-colors hover:bg-slate-750 ${getUrgencyColor(order.planned_date, order.status)}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-amber-400">#{order.number}</span>
        {order.planned_date && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="h-3 w-3" />
            {new Date(order.planned_date).toLocaleDateString('pl-PL')}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-200 line-clamp-1">{order.description || 'Brak opisu'}</p>
      <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
        <User className="h-3 w-3" />
        {clientName}
      </div>
    </Link>
  )
}
```

**Step 3: Create KanbanColumn component**

`src/components/KanbanColumn.tsx`:
```typescript
import type { Order } from '../types/database'
import OrderCard from './OrderCard'

interface Props {
  title: string
  orders: Order[]
  color: string
}

export default function KanbanColumn({ title, orders, color }: Props) {
  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">{title}</h2>
        <span className="ml-auto text-xs text-slate-500">{orders.length}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto rounded-lg bg-slate-850 p-2 min-h-[200px]">
        {orders.length === 0 && (
          <p className="py-8 text-center text-xs text-slate-600">Brak zamówień</p>
        )}
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}
```

**Step 4: Create DashboardStats component**

`src/components/DashboardStats.tsx`:
```typescript
import { ClipboardList, CheckCircle, Clock } from 'lucide-react'
import type { Order } from '../types/database'

export default function DashboardStats({ orders }: { orders: Order[] }) {
  const inProgress = orders.filter((o) => o.status === 'w_trakcie').length
  const ready = orders.filter((o) => o.status === 'gotowe').length
  const newOrders = orders.filter((o) => o.status === 'nowe').length

  const stats = [
    { label: 'Nowe', value: newOrders, icon: ClipboardList, color: 'text-blue-400' },
    { label: 'W trakcie', value: inProgress, icon: Clock, color: 'text-amber-400' },
    { label: 'Gotowe', value: ready, icon: CheckCircle, color: 'text-emerald-400' },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg bg-slate-800 p-4">
          <div className="flex items-center gap-2">
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
            <span className="text-xs text-slate-400 uppercase tracking-wide">{stat.label}</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-100">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
```

**Step 5: Update DashboardPage**

`src/pages/DashboardPage.tsx`:
```typescript
import { useOrders } from '../hooks/useOrders'
import KanbanColumn from '../components/KanbanColumn'
import DashboardStats from '../components/DashboardStats'

const columns = [
  { status: 'nowe', title: 'Nowe', color: 'bg-blue-400' },
  { status: 'w_trakcie', title: 'W trakcie', color: 'bg-amber-400' },
  { status: 'gotowe', title: 'Gotowe', color: 'bg-emerald-400' },
  { status: 'wydane', title: 'Do odbioru', color: 'bg-violet-400' },
] as const

export default function DashboardPage() {
  const { orders, loading, error } = useOrders()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-amber-500" />
      </div>
    )
  }

  if (error) {
    return <p className="py-8 text-center text-red-400">{error}</p>
  }

  return (
    <div className="space-y-6">
      <DashboardStats orders={orders} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => (
          <KanbanColumn
            key={col.status}
            title={col.title}
            color={col.color}
            orders={orders.filter((o) => o.status === col.status)}
          />
        ))}
      </div>
    </div>
  )
}
```

**Step 6: Update router with order detail route**

In `src/router.tsx`, add import and route for order detail page (placeholder for now):

```typescript
// Add to imports:
import OrderDetailPage from './pages/OrderDetailPage'

// Add to children array after index:
{ path: 'zamowienia', element: <OrdersListPage /> },
{ path: 'zamowienia/:id', element: <OrderDetailPage /> },
```

Create placeholder pages `src/pages/OrdersListPage.tsx` and `src/pages/OrderDetailPage.tsx`.

**Step 7: Verify dev server**

```bash
npm run dev
```

Navigate to localhost:5173, verify Kanban board renders (with empty columns).

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add dashboard with Kanban board, order cards, realtime updates"
```

---

## Task 6: Order Detail Page — Elements Table + Pricing

**Files:**
- Create: `src/hooks/useOrder.ts`
- Create: `src/hooks/useOrderItems.ts`
- Create: `src/hooks/useClientPricing.ts`
- Create: `src/hooks/useWorkLogs.ts`
- Create: `src/hooks/usePaintingVariants.ts`
- Create: `src/hooks/useClients.ts`
- Create: `src/pages/OrderDetailPage.tsx` (replace placeholder)
- Create: `src/components/OrderItemsTable.tsx`
- Create: `src/components/OrderSummary.tsx`
- Create: `src/components/WorkLogTimeline.tsx`
- Create: `src/components/OrderItemFormModal.tsx`
- Create: `src/components/WorkLogFormModal.tsx`

**Step 1: Create data hooks**

`src/hooks/useOrder.ts` — fetches single order by id with client join.

`src/hooks/useOrderItems.ts` — fetches items for an order with variant join. Provides add/update/delete functions. Auto-calculates m2 and total_price before save:
- `m2 = length_mm * width_mm * quantity * variant.sides / 1_000_000`
- `total_price = m2 * price_per_m2`

`src/hooks/useClientPricing.ts` — fetches pricing overrides for a given client_id. Returns function `getPriceForVariant(variantId, clientId)` which checks client_pricing first, then falls back to painting_variants.default_price_per_m2.

`src/hooks/useWorkLogs.ts` — fetches work logs for an order. Provides add function. Auto-calculates `cost = hours * hourly_rate`.

`src/hooks/usePaintingVariants.ts` — fetches all painting variants.

`src/hooks/useClients.ts` — fetches all clients.

**Step 2: Create OrderItemsTable**

Table columns: #, Długość (mm), Szerokość (mm), Ilość, Rodzaj, Uchwyt, m2, Cena/m2, Razem.
- Each row is editable inline or via modal
- "Dodaj element" button at bottom
- When variant changes, auto-fill price from client pricing
- m2 and totals auto-calculate

**Step 3: Create OrderSummary**

Shows:
- Materiał m2: sum of items where calculation uses 1-side area
- Lakier m2: sum of items using full m2 (sides included)
- Wartość zamówienia: sum of total_price
- Koszty pracy: sum of work_logs.cost
- Zysk: value - labor costs
- Zysk/h: profit / total hours

**Step 4: Create WorkLogTimeline**

Timeline of work stages with:
- Date, worker name, operation, hours, rate, cost
- "Dodaj etap" button opens WorkLogFormModal
- Color-coded operation badges

**Step 5: Create form modals**

`OrderItemFormModal`: fields for length, width, quantity, variant (dropdown), handle (checkbox), notes.
`WorkLogFormModal`: fields for worker (dropdown of known names), operation (dropdown of known operations), date, hours, rate, m2_painted.

**Step 6: Build OrderDetailPage**

Layout:
- Header: order number, client name, status badge, dates
- Status change buttons (Nowe -> W trakcie -> Gotowe -> Wydane -> Zapłacone)
- Checklist: material provided, paints provided, dimensions entered
- OrderItemsTable
- OrderSummary
- WorkLogTimeline

**Step 7: Update order status mutation**

Function to update order status in Supabase. When changing to 'gotowe', auto-set ready_date to today.

**Step 8: Verify**

Run dev server. Create a test order via Supabase dashboard. Navigate to order detail. Add elements, verify m2 and pricing calculations.

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: add order detail page with elements table, pricing, work logs"
```

---

## Task 7: Orders List Page + New Order Form

**Files:**
- Create: `src/pages/OrdersListPage.tsx` (replace placeholder)
- Create: `src/components/NewOrderModal.tsx`

**Step 1: Build OrdersListPage**

Table with columns: #, Klient, Opis, Status, Planowana data, Wartość.
- Status badge with color
- Sortable by number, date
- Filter by status (tabs: Wszystkie | Nowe | W trakcie | Gotowe | Wydane)
- Search by client name or description
- "Nowe zamówienie" button opens NewOrderModal
- Click row navigates to order detail

**Step 2: Create NewOrderModal**

Fields: client (dropdown), description, planned date, notes.
On save: insert into orders table, navigate to new order detail page.

**Step 3: Update router**

Ensure `/zamowienia` route points to OrdersListPage.

**Step 4: Verify and commit**

```bash
git add -A
git commit -m "feat: add orders list page with search, filters, new order form"
```

---

## Task 8: Client Management + Pricing

**Files:**
- Create: `src/pages/ClientsPage.tsx`
- Create: `src/components/ClientPricingTable.tsx`
- Create: `src/components/ClientFormModal.tsx`
- Create: `src/hooks/useClientPricingAll.ts`

**Step 1: Build ClientsPage**

Left panel: client list with search. Click client to see pricing on right.
"Dodaj klienta" button opens ClientFormModal.

**Step 2: Build ClientPricingTable**

For selected client, show table:
- Rows: all painting variants
- Columns: Wariant, Cena domyślna, Cena klienta, Akcja
- Inline edit for client-specific price
- If no client pricing exists, show default and "Ustaw cenę" button
- Save creates/updates client_pricing row

**Step 3: Build ClientFormModal**

Fields: name, type (individual/company), contact_info, access_code (auto-generate PIN).

**Step 4: Update router**

Add `/klienci` route pointing to ClientsPage.

**Step 5: Verify and commit**

```bash
git add -A
git commit -m "feat: add client management with per-client variant pricing"
```

---

## Task 9: Worker Report Page

**Files:**
- Create: `src/pages/WorkerReportPage.tsx`
- Create: `src/hooks/useWorkLogsReport.ts`

**Step 1: Create useWorkLogsReport hook**

Fetches work_logs with date range filter and optional worker filter. Joins order number and client name. Groups by worker for summary.

**Step 2: Build WorkerReportPage**

- Filters: date range (default: current month), worker dropdown
- Table: Data, Pracownik, Operacja, Nr zamówienia, Klient, Czas, Stawka, Koszt
- Summary cards per worker: total hours, total cost, m2 painted
- CSV export button: generates and downloads CSV

**Step 3: Update router**

Add `/raport` route.

**Step 4: Verify and commit**

```bash
git add -A
git commit -m "feat: add worker report page with date filters, per-worker summary, CSV export"
```

---

## Task 10: Financial Summary Page

**Files:**
- Create: `src/pages/FinancePage.tsx`
- Create: `src/hooks/useFinanceSummary.ts`
- Create: `src/hooks/useMonthlyCosts.ts`

**Step 1: Create hooks**

`useFinanceSummary`: aggregates revenue (sum of order values), labor costs (sum of work_logs), material costs (sum of paint_purchases), fixed costs (from monthly_costs) for a date range.

`useMonthlyCosts`: CRUD for monthly_costs table.

**Step 2: Build FinancePage**

- Date range filter
- Summary cards: Przychody, Koszty pracy, Materiały, Koszty stałe, Zysk netto
- Order profitability table: #, Klient, Wartość, Koszty, Marża, Zysk/h
- Monthly costs editor section
- Color coding: green for profit, red for loss

**Step 3: Update router**

Add `/finanse` route.

**Step 4: Verify and commit**

```bash
git add -A
git commit -m "feat: add financial summary page with profitability analysis"
```

---

## Task 11: Paint Purchases Page

**Files:**
- Create: `src/pages/PaintPurchasesPage.tsx`
- Create: `src/hooks/usePaintPurchases.ts`
- Create: `src/components/PaintPurchaseFormModal.tsx`

**Step 1: Create hook**

Fetches paint_purchases with optional date range and supplier filter. Provides add/update/delete.

**Step 2: Build page**

- Table: Data, Dostawca, Produkt, Ilość, Jednostka, Cena jedn., Suma, Zamówienie
- "Dodaj zakup" button
- Summary: total per supplier, total per month
- Optional order assignment dropdown

**Step 3: Build form modal**

Fields: date, supplier, product, quantity, unit (dropdown: kg/l/szt), unit_price, order (optional dropdown).

**Step 4: Update router**

Add `/lakiery` route.

**Step 5: Verify and commit**

```bash
git add -A
git commit -m "feat: add paint purchases page with supplier tracking"
```

---

## Task 12: Client Portal

**Files:**
- Create: `src/pages/ClientPortalPage.tsx`
- Create: `src/pages/ClientLoginPage.tsx`
- Create: `src/hooks/useClientPortal.ts`

**Step 1: Create client login flow**

`ClientLoginPage`: simple form with access code input. On submit, query clients table where access_code matches. Store client_id in localStorage.

**Step 2: Create ClientPortalPage**

Shows orders for the client:
- Order cards: number, description, status icon (new/in production/ready/picked up)
- No prices, no costs, no financial data
- Status badges with Polish labels and icons
- Clean, simple design

**Step 3: Update router**

Add public routes (outside ProtectedRoute):
- `/portal` → ClientLoginPage
- `/portal/zamowienia` → ClientPortalPage

**Step 4: Verify and commit**

```bash
git add -A
git commit -m "feat: add client portal with access code login, order status view"
```

---

## Task 13: Full Router Assembly + Final Polish

**Files:**
- Modify: `src/router.tsx`
- Modify: `src/layouts/AppLayout.tsx`

**Step 1: Assemble all routes**

Final `src/router.tsx`:
```typescript
import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import AppLayout from './layouts/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import OrdersListPage from './pages/OrdersListPage'
import OrderDetailPage from './pages/OrderDetailPage'
import WorkerReportPage from './pages/WorkerReportPage'
import FinancePage from './pages/FinancePage'
import ClientsPage from './pages/ClientsPage'
import PaintPurchasesPage from './pages/PaintPurchasesPage'
import ClientLoginPage from './pages/ClientLoginPage'
import ClientPortalPage from './pages/ClientPortalPage'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/portal', element: <ClientLoginPage /> },
      { path: '/portal/zamowienia', element: <ClientPortalPage /> },
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'zamowienia', element: <OrdersListPage /> },
          { path: 'zamowienia/:id', element: <OrderDetailPage /> },
          { path: 'raport', element: <WorkerReportPage /> },
          { path: 'finanse', element: <FinancePage /> },
          { path: 'klienci', element: <ClientsPage /> },
          { path: 'lakiery', element: <PaintPurchasesPage /> },
        ],
      },
    ],
  },
])
```

**Step 2: Final build and test**

```bash
npm run build
npm run lint
```

Fix any TypeScript or lint errors.

**Step 3: Push and deploy**

```bash
git add -A
git commit -m "feat: assemble all routes, final polish"
git push
```

Verify GitHub Pages deployment works end-to-end.

---

## Execution Notes

- **Dark theme throughout**: bg-slate-900 for main areas, bg-slate-800 for cards, amber-400/500 for accents
- **Large screen optimized**: Dashboard uses xl:grid-cols-4 for Kanban, large font sizes
- **Mobile friendly**: Hamburger menu, responsive grids
- **Polish language**: All UI text in Polish
- **Realtime**: Orders table subscribed via Supabase realtime for dashboard auto-refresh
- **Auto-calculations**: m2 and pricing computed on save, not stored as formulas
