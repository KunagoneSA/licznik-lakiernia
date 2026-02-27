import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, ChevronUp, ChevronDown } from 'lucide-react'
import { useOrders } from '../hooks/useOrders'
import type { OrderStatus } from '../types/database'
import NewOrderModal from '../components/NewOrderModal'

const statusLabels: Record<OrderStatus, string> = {
  nowe: 'Nowe',
  w_trakcie: 'W trakcie',
  gotowe: 'Gotowe',
  wydane: 'Wydane',
  'zapłacone': 'Zapłacone',
}

const statusColors: Record<OrderStatus, string> = {
  nowe: 'bg-blue-50 text-blue-600',
  w_trakcie: 'bg-amber-50 text-amber-600',
  gotowe: 'bg-emerald-50 text-emerald-600',
  wydane: 'bg-violet-50 text-violet-600',
  'zapłacone': 'bg-gray-100 text-gray-500',
}

const tabs = ['wszystkie', 'nowe', 'w_trakcie', 'gotowe', 'wydane'] as const

function getClientName(order: Record<string, unknown>): string {
  const client = order.client as { name: string } | null
  return client?.name ?? '—'
}

function getOrderValue(order: Record<string, unknown>): number {
  const items = order.order_items as { total_price: number }[] | undefined
  return items?.reduce((s, i) => s + Number(i.total_price), 0) ?? 0
}

function isOverdue(order: { planned_date: string | null; status: string }): boolean {
  if (!order.planned_date) return false
  if (order.status === 'gotowe' || order.status === 'wydane' || order.status === 'zapłacone') return false
  return new Date(order.planned_date).getTime() < Date.now()
}

type SortKey = 'number' | 'client' | 'status' | 'planned_date' | 'value'
type SortDir = 'asc' | 'desc'

export default function OrdersListPage() {
  const { orders, loading, refetch } = useOrders()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<string>('wszystkie')
  const [showNew, setShowNew] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('number')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'number' ? 'desc' : 'asc')
    }
  }

  const filtered = useMemo(() => {
    const list = orders.filter((o) => {
      if (tab !== 'wszystkie' && o.status !== tab) return false
      if (search) {
        const q = search.toLowerCase()
        const clientName = getClientName(o as unknown as Record<string, unknown>).toLowerCase()
        return clientName.includes(q) || (o.description ?? '').toLowerCase().includes(q) || String(o.number).includes(q)
      }
      return true
    })

    const statusOrder = ['nowe', 'w_trakcie', 'gotowe', 'wydane', 'zapłacone']
    const dir = sortDir === 'asc' ? 1 : -1

    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'number': return (a.number - b.number) * dir
        case 'client': return getClientName(a as unknown as Record<string, unknown>).localeCompare(getClientName(b as unknown as Record<string, unknown>), 'pl') * dir
        case 'status': return (statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)) * dir
        case 'planned_date': {
          const da = a.planned_date ?? ''
          const db = b.planned_date ?? ''
          return da.localeCompare(db) * dir
        }
        case 'value': return (getOrderValue(a as unknown as Record<string, unknown>) - getOrderValue(b as unknown as Record<string, unknown>)) * dir
        default: return 0
      }
    })
  }, [orders, tab, search, sortKey, sortDir])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Zamówienia</h1>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          Nowe zamówienie
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj klienta, opisu lub numeru..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-white border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t ? 'bg-amber-50 text-amber-600' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t === 'wszystkie' ? 'Wszystkie' : statusLabels[t as OrderStatus]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <SortHeader label="#" sortKey="number" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Klient" sortKey="client" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opis</th>
                <SortHeader label="Status" sortKey="status" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Wartość" sortKey="value" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Termin" sortKey="planned_date" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const value = getOrderValue(order as unknown as Record<string, unknown>)
                const overdue = isOverdue(order)
                return (
                  <tr key={order.id} className={`border-b border-gray-100 hover:bg-gray-50 ${overdue ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <Link to={`/zamowienia/${order.id}`} className="font-medium text-amber-600 hover:underline">
                        {order.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{getClientName(order as unknown as Record<string, unknown>)}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{order.description || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-amber-600">
                      {value > 0 ? `${value.toFixed(0)} zł` : '—'}
                    </td>
                    <td className={`px-4 py-3 ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {order.planned_date ? new Date(order.planned_date).toLocaleDateString('pl-PL') : '—'}
                      {overdue && <span className="ml-1 text-xs">!</span>}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <p className="text-gray-500">Brak zamówień</p>
                    <p className="mt-1 text-xs text-gray-400">{search ? 'Spróbuj zmienić wyszukiwanie' : 'Dodaj pierwsze zamówienie przyciskiem powyżej'}</p>
                  </td>
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

function SortHeader({ label, sortKey, currentKey, dir, onSort }: {
  label: string; sortKey: SortKey; currentKey: SortKey; dir: SortDir; onSort: (k: SortKey) => void
}) {
  const active = sortKey === currentKey
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </span>
    </th>
  )
}
