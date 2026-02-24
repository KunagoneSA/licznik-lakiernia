import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Users, BarChart3, ShoppingCart, Menu, X, Paintbrush, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

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
  const { signOut } = useAuth()

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
            ? 'bg-amber-50 text-amber-700'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }`
      }
    >
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </NavLink>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-gray-200 bg-white">
        <div className="flex h-14 items-center gap-2 px-5 border-b border-gray-200">
          <div className="h-7 w-7 rounded-md bg-amber-500 flex items-center justify-center">
            <Paintbrush className="h-4 w-4 text-slate-900" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
            Lakiernia
          </span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => renderNavLink(item))}
        </nav>
        <div className="px-3 pb-4">
          <button onClick={signOut} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <LogOut className="h-[18px] w-[18px]" />
            Wyloguj się
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col transform transition-transform duration-200 ease-out md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-14 items-center justify-between px-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-amber-500 flex items-center justify-center">
              <Paintbrush className="h-4 w-4 text-slate-900" />
            </div>
            <span className="text-sm font-semibold tracking-wide text-gray-900 uppercase">Lakiernia</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="rounded-md p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => renderNavLink(item, () => setMobileOpen(false)))}
        </nav>
        <div className="px-3 pb-4">
          <button onClick={signOut} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <LogOut className="h-[18px] w-[18px]" />
            Wyloguj się
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 md:hidden">
          <button onClick={() => setMobileOpen(true)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold tracking-wide text-gray-900 uppercase">Lakiernia</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
