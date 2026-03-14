import { ClipboardList, CheckCircle, Clock, PackageCheck, FileText } from 'lucide-react'
import type { Order } from '../types/database'

export default function DashboardStats({ orders }: { orders: Order[] }) {
  const newCount = orders.filter((o) => o.status === 'nowe').length
  const inProgress = orders.filter((o) => o.status === 'w_trakcie').length
  const ready = orders.filter((o) => o.status === 'gotowe').length
  const wydane = orders.filter((o) => o.status === 'wydane').length
  const fvWystawiona = orders.filter((o) => o.status === 'fv_wystawiona').length

  const stats = [
    { label: 'Nowe', value: newCount, icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'W trakcie', value: inProgress, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Gotowe', value: ready, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Oddane', value: wydane, icon: PackageCheck, color: 'text-violet-500', bg: 'bg-violet-50' },
    { label: 'FV wyst.', value: fvWystawiona, icon: FileText, color: 'text-pink-500', bg: 'bg-pink-50' },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg bg-white shadow-sm px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <div className={`rounded-md p-1 ${stat.bg}`}>
              <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
            </div>
            <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">{stat.label}</span>
          </div>
          <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
