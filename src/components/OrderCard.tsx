import { Link } from 'react-router-dom'
import { Calendar, Building2, User } from 'lucide-react'
import type { Order } from '../types/database'
import ColorSwatch from './ColorSwatch'

function getUrgencyClass(plannedDate: string | null, status: string): string {
  if (status === 'gotowe' || status === 'wydane' || status === 'fv_wystawiona' || status === 'zapłacone') return 'border-l-emerald-500'
  if (!plannedDate) return 'border-l-gray-300'
  const days = Math.ceil((new Date(plannedDate).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'border-l-red-500'
  if (days <= 3) return 'border-l-amber-500'
  return 'border-l-emerald-500'
}

function getClient(order: Order): { name: string; type?: string } | null {
  return (order as unknown as Record<string, unknown>).client as { name: string; type?: string } | null
}

function formatNumber(num: number, createdAt: string): string {
  const year = new Date(createdAt).getFullYear() % 100
  return `${num}/${year}`
}

export default function OrderCard({ order }: { order: Order }) {
  return (
    <Link
      to={`/zamowienia/${order.id}`}
      className={`block rounded-lg border-l-4 bg-white shadow-sm px-2.5 py-1.5 transition-colors hover:bg-gray-50 ${getUrgencyClass(order.planned_date, order.status)}`}
    >
      <div>
        <div className="flex items-center gap-1 text-xs flex-wrap">
          <span className="font-bold text-amber-600">{formatNumber(order.number, order.created_at)}</span>
          <span className="text-gray-400">·</span>
          <span className="flex items-center gap-0.5 text-[11px] text-gray-700 font-medium">
            {getClient(order)?.type === 'company' ? <Building2 className="h-3 w-3 text-blue-500 shrink-0" /> : <User className="h-3 w-3 text-violet-500 shrink-0" />}
            {getClient(order)?.name ?? '—'}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="text-[11px] text-gray-600 line-clamp-1 flex-1 min-w-0">{order.description || 'Brak opisu'}</p>
          {order.planned_date && (() => {
            const overdue = !['gotowe', 'wydane', 'fv_wystawiona', 'zapłacone'].includes(order.status) && new Date(order.planned_date).getTime() < Date.now()
            return (
              <span className={`flex items-center gap-1 text-[11px] shrink-0 ${overdue ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                <Calendar className="h-3 w-3" />
                {new Date(order.planned_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
              </span>
            )
          })()}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          {order.color ? (
            <p className="flex items-center gap-1 text-[10px] font-medium text-gray-500 truncate"><ColorSwatch color={order.color} size="sm" />{order.color}</p>
          ) : <span />}
          {(!order.material_provided || !order.paints_provided) && (
            <div className="flex gap-1 shrink-0">
              {!order.material_provided && <span className="text-[9px] font-bold text-red-500 bg-red-50 rounded px-1 py-0.5">Materiał</span>}
              {!order.paints_provided && <span className="text-[9px] font-bold text-red-500 bg-red-50 rounded px-1 py-0.5">Lakiery</span>}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
