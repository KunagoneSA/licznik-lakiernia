import { ClipboardList, CheckCircle, Clock } from 'lucide-react'
import type { Order } from '../types/database'

export default function DashboardStats({ orders }: { orders: Order[] }) {
  const newCount = orders.filter((o) => o.status === 'nowe').length
  const inProgress = orders.filter((o) => o.status === 'w_trakcie').length
  const ready = orders.filter((o) => o.status === 'gotowe').length

  const stats = [
    { label: 'Nowe', value: newCount, icon: ClipboardList, color: 'text-blue-400' },
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
