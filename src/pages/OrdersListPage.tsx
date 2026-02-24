import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useOrders } from '../hooks/useOrders'
import type { OrderStatus } from '../types/database'
import NewOrderModal from '../components/NewOrderModal'

const statusLabels: Record<OrderStatus, string> = {
  nowe: 'Nowe',
  w_trakcie: 'W trakcie',
  gotowe: 'Gotowe',
  wydane: 'Wydane',
  'zapłacone': 'Zaplacone',
}

const statusColors: Record<OrderStatus, string> = {
  nowe: 'bg-blue-500/20 text-blue-400',
  w_trakcie: 'bg-amber-500/20 text-amber-400',
  gotowe: 'bg-emerald-500/20 text-emerald-400',
  wydane: 'bg-violet-500/20 text-violet-400',
  'zapłacone': 'bg-slate-500/20 text-slate-400',
}

const tabs = ['wszystkie', 'nowe', 'w_trakcie', 'gotowe', 'wydane'] as const

function getClientName(order: Record<string, unknown>): string {
  const client = order.client as { name: string } | null
  return client?.name ?? '—'
}

export default function OrdersListPage() {
  const { orders, loading, refetch } = useOrders()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<string>('wszystkie')
  const [showNew, setShowNew] = useState(false)

  const filtered = orders.filter((o) => {
    if (tab !== 'wszystkie' && o.status !== tab) return false
    if (search) {
      const q = search.toLowerCase()
      const clientName = getClientName(o as unknown as Record<string, unknown>).toLowerCase()
      return clientName.includes(q) || (o.description ?? '').toLowerCase().includes(q) || String(o.number).includes(q)
    }
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Zamowienia</h1>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          Nowe zamowienie
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Szukaj klienta, opisu lub numeru..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {t === 'wszystkie' ? 'Wszystkie' : statusLabels[t as OrderStatus]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-amber-500" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Klient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Opis</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Termin</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <Link to={`/zamowienia/${order.id}`} className="font-medium text-amber-400 hover:underline">
                      {order.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-200">{getClientName(order as unknown as Record<string, unknown>)}</td>
                  <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{order.description || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {order.planned_date ? new Date(order.planned_date).toLocaleDateString('pl-PL') : '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Brak zamowien</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewOrderModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); refetch() }} />}
    </div>
  )
}
