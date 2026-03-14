import { ClipboardList, CheckCircle, Clock, PackageCheck, FileText } from 'lucide-react'
import type { Order } from '../types/database'

export default function DashboardStats({ orders }: { orders: Order[] }) {
  const stats = [
    { label: 'Nowe', value: orders.filter((o) => o.status === 'nowe').length, icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-50', wide: false },
    { label: 'W trakcie', value: orders.filter((o) => o.status === 'w_trakcie').length, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', wide: true },
    { label: 'Gotowe', value: orders.filter((o) => o.status === 'gotowe').length, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50', wide: false },
    { label: 'Oddane', value: orders.filter((o) => o.status === 'wydane').length, icon: PackageCheck, color: 'text-violet-500', bg: 'bg-violet-50', wide: false },
    { label: 'FV wyst.', value: orders.filter((o) => o.status === 'fv_wystawiona').length, icon: FileText, color: 'text-pink-500', bg: 'bg-pink-50', wide: false },
  ]

  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 xl:grid-cols-6">
      {stats.map((stat) => (
        <div key={stat.label} className={`rounded-lg bg-white shadow-sm px-3 py-2.5 flex items-center gap-2 ${stat.wide ? 'xl:col-span-2' : ''}`}>
          <div className={`rounded-md p-1.5 ${stat.bg}`}>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium leading-none">{stat.label}</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
