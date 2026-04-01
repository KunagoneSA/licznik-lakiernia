import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Users, ShoppingCart, Menu, X, LogOut, Tag, HardHat, Truck, Package, FileBarChart, CalendarDays, CalendarRange, Wallet } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'


const mainNav = [
  { to: '/zamowienia', icon: ClipboardList, label: 'Zamówienia' },
  { to: '/', icon: LayoutDashboard, label: 'Tablica' },
  { to: '/lakiery', icon: ShoppingCart, label: 'Zakupy lakierów' },
  { to: '/dziennik-pracy', icon: CalendarDays, label: 'Dziennik pracy' },
] as const

const baseNav = [
  { to: '/cennik', icon: Tag, label: 'Cennik' },
  { to: '/klienci', icon: Users, label: 'Klienci' },
  { to: '/dostawcy', icon: Truck, label: 'Dostawcy' },
  { to: '/materialy', icon: Package, label: 'Materiały' },
  { to: '/pracownicy', icon: HardHat, label: 'Pracownicy' },
] as const

const reportNav = [
  { to: '/raport', icon: FileBarChart, label: 'Raport pracowników' },
  { to: '/raport-miesieczny', icon: CalendarRange, label: 'Raport miesięczny' },
] as const

const adminNav = [
  { to: '/finanse', icon: Wallet, label: 'Finanse' },
] as const

type NavItem = typeof mainNav[number] | typeof baseNav[number] | typeof reportNav[number] | typeof adminNav[number]

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, isAdmin, signOut } = useAuth()

  const renderNavLink = (
    { to, icon: Icon, label }: NavItem,
    onClick?: () => void
  ) => (
    <NavLink
      key={to}
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
          isActive
            ? 'bg-amber-50 text-amber-700'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }`
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-48 md:flex-col md:border-r md:border-gray-200 bg-white">
        <div className="flex flex-col items-center justify-center h-24 px-3 border-b border-gray-200">
          <img src={`${import.meta.env.BASE_URL}logo-kunagone.png`} alt="Kunagone" className="h-16 w-auto" />
          <span className="text-[9px] text-gray-400">ver. 1.15</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {mainNav.map((item) => renderNavLink(item))}
          <div className="pt-6 pb-1 px-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Bazy</span>
          </div>
          {baseNav.map((item) => renderNavLink(item))}
          <div className="pt-6 pb-1 px-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Raporty</span>
          </div>
          {reportNav.map((item) => renderNavLink(item))}
          {isAdmin && (
            <>
              <div className="pt-6 pb-1 px-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Admin</span>
              </div>
              {adminNav.map((item) => renderNavLink(item))}
            </>
          )}
        </nav>
        <div className="relative z-10 px-3 pb-4 space-y-1 border-t border-gray-200 pt-2 shrink-0">
          {user && (
            <div className="px-3 py-2">
              {user.user_metadata?.full_name && (
                <div className="text-xs font-medium text-gray-600 truncate">{user.user_metadata.full_name}</div>
              )}
              <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
            </div>
          )}
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer">
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
          <img src={`${import.meta.env.BASE_URL}logo-kunagone.png`} alt="Kunagone" className="h-14 w-auto" />
          <button onClick={() => setMobileOpen(false)} className="rounded-md p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {mainNav.map((item) => renderNavLink(item, () => setMobileOpen(false)))}
          <div className="pt-6 pb-1 px-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Bazy</span>
          </div>
          {baseNav.map((item) => renderNavLink(item, () => setMobileOpen(false)))}
          <div className="pt-6 pb-1 px-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Raporty</span>
          </div>
          {reportNav.map((item) => renderNavLink(item, () => setMobileOpen(false)))}
          {isAdmin && (
            <>
              <div className="pt-6 pb-1 px-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Admin</span>
              </div>
              {adminNav.map((item) => renderNavLink(item, () => setMobileOpen(false)))}
            </>
          )}
        </nav>
        <div className="px-3 pb-4 space-y-1">
          {user && (
            <div className="px-3 py-2">
              {user.user_metadata?.full_name && (
                <div className="text-xs font-medium text-gray-600 truncate">{user.user_metadata.full_name}</div>
              )}
              <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
            </div>
          )}
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
          <img src={`${import.meta.env.BASE_URL}logo-kunagone.png`} alt="Kunagone" className="h-10 w-auto" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
