import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronUp, ChevronDown, Building2, User } from 'lucide-react'
import { useOrders } from '../hooks/useOrders'
import { usePaintingVariants } from '../hooks/usePaintingVariants'
import type { OrderStatus } from '../types/database'
import ColorSwatch from '../components/ColorSwatch'
import NewOrderModal from '../components/NewOrderModal'

const statusLabels: Record<OrderStatus, string> = {
  nowe: 'Nowe',
  w_trakcie: 'W trakcie',
  gotowe: 'Gotowe',
  wydane: 'Wydane',
  fv_wystawiona: 'FV wystawiona',
  'zapłacone': 'Zapłacone',
}

const statusColors: Record<OrderStatus, string> = {
  nowe: 'bg-blue-50 text-blue-600',
  w_trakcie: 'bg-amber-50 text-amber-600',
  gotowe: 'bg-emerald-50 text-emerald-600',
  wydane: 'bg-violet-50 text-violet-600',
  fv_wystawiona: 'bg-pink-50 text-pink-600',
  'zapłacone': 'bg-gray-100 text-gray-500',
}

const tabs = ['wszystkie', 'nowe', 'w_trakcie', 'gotowe', 'wydane', 'fv_wystawiona', 'niezapłacone'] as const

function getClient(order: Record<string, unknown>): { name: string; type?: string } | null {
  return order.client as { name: string; type?: string } | null
}
function getClientNameStr(order: Record<string, unknown>): string {
  return getClient(order)?.name ?? '—'
}

interface OrderItem {
  total_price: number
  m2: number
  quantity: number
  has_handle: boolean
  has_wplyka: boolean
  color_surcharge: boolean
}

function getOrderValue(order: Record<string, unknown>, handlePrice: number, wplykaPrice: number, colorSurchargePrice: number): number {
  const items = order.order_items as OrderItem[] | undefined
  if (!items) return 0
  const base = items.reduce((s, i) => s + Number(i.total_price), 0)
  const handles = items.filter(i => i.has_handle).reduce((s, i) => s + handlePrice * Number(i.quantity), 0)
  const wplyka = items.filter(i => i.has_wplyka).reduce((s, i) => s + wplykaPrice * Number(i.quantity), 0)
  const colorSurcharge = items.filter(i => i.color_surcharge).reduce((s, i) => s + colorSurchargePrice * Number(i.m2), 0)
  return base + handles + wplyka + colorSurcharge
}

function isOverdue(order: { planned_date: string | null; status: string }): boolean {
  if (!order.planned_date) return false
  if (order.status === 'gotowe' || order.status === 'wydane' || order.status === 'fv_wystawiona' || order.status === 'zapłacone') return false
  return new Date(order.planned_date).getTime() < Date.now()
}

type SortKey = 'number' | 'accepted_date' | 'client' | 'status' | 'planned_date' | 'ready_date' | 'value'
type SortDir = 'asc' | 'desc'

export default function OrdersListPage() {
  const navigate = useNavigate()
  const { orders, loading, refetch } = useOrders()
  const { variants } = usePaintingVariants()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<string>('wszystkie')
  const [showNew, setShowNew] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('number')

  // Surcharge prices from variants
  const handlePrice = useMemo(() => {
    const v = variants.find(v => v.name === 'Uchwyt frezowany')
    return v?.default_price_per_m2 ?? 0
  }, [variants])
  const wplykaPrice = useMemo(() => {
    const v = variants.find(v => v.name.toLowerCase().includes('wpyłka') || v.name.toLowerCase().includes('wpłyka') || v.name.toLowerCase().includes('wypłka'))
    return v?.default_price_per_m2 ?? 0
  }, [variants])
  const colorSurchargePrice = useMemo(() => {
    const v = variants.find(v => v.name === 'Dopłata do koloru')
    return v?.default_price_per_m2 ?? 0
  }, [variants])
  const [sortDir, setSortDir] = useState<SortDir>('asc')

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
      if (tab === 'niezapłacone' && o.status !== 'wydane' && o.status !== 'fv_wystawiona') return false
      else if (tab !== 'wszystkie' && tab !== 'niezapłacone' && o.status !== tab) return false
      if (search) {
        const q = search.toLowerCase()
        const clientName = getClientNameStr(o as unknown as Record<string, unknown>).toLowerCase()
        return clientName.includes(q) || (o.description ?? '').toLowerCase().includes(q) || String(o.number).includes(q)
      }
      return true
    })

    const statusOrder = ['nowe', 'w_trakcie', 'gotowe', 'wydane', 'fv_wystawiona', 'zapłacone']
    const dir = sortDir === 'asc' ? 1 : -1

    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'number': return (a.number - b.number) * dir
        case 'accepted_date': return (a.accepted_date ?? '').localeCompare(b.accepted_date ?? '') * dir
        case 'client': return getClientNameStr(a as unknown as Record<string, unknown>).localeCompare(getClientNameStr(b as unknown as Record<string, unknown>), 'pl') * dir
        case 'status': return (statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)) * dir
        case 'planned_date': {
          const da = a.planned_date ?? ''
          const db = b.planned_date ?? ''
          return da.localeCompare(db) * dir
        }
        case 'ready_date': return (a.ready_date ?? '').localeCompare(b.ready_date ?? '') * dir
        case 'value': return (getOrderValue(a as unknown as Record<string, unknown>, handlePrice, wplykaPrice, colorSurchargePrice) - getOrderValue(b as unknown as Record<string, unknown>, handlePrice, wplykaPrice, colorSurchargePrice)) * dir
        default: return 0
      }
    })
  }, [orders, tab, search, sortKey, sortDir, handlePrice, wplykaPrice, colorSurchargePrice])

  const totalValue = useMemo(() => {
    return filtered.reduce((sum, o) => sum + getOrderValue(o as unknown as Record<string, unknown>, handlePrice, wplykaPrice, colorSurchargePrice), 0)
  }, [filtered, handlePrice, wplykaPrice, colorSurchargePrice])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 max-w-3xl">
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
        <div className="flex flex-col gap-1">
          <div className="flex gap-1">
            {tabs.slice(0, 4).map((t) => {
              const tabColors: Record<string, { active: string; inactive: string }> = {
                wszystkie: { active: 'bg-gray-700 text-white', inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
                nowe: { active: 'bg-blue-500 text-white', inactive: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
                w_trakcie: { active: 'bg-amber-500 text-white', inactive: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
                gotowe: { active: 'bg-emerald-500 text-white', inactive: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
              }
              const colors = tabColors[t]
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === t ? colors.active : colors.inactive
                  }`}
                >
                  {t === 'wszystkie' ? 'Wszystkie' : statusLabels[t as OrderStatus]}
                </button>
              )
            })}
          </div>
          <div className="flex gap-1">
            {tabs.slice(4).map((t) => {
              const tabColors: Record<string, { active: string; inactive: string }> = {
                wydane: { active: 'bg-violet-500 text-white', inactive: 'bg-violet-50 text-violet-600 hover:bg-violet-100' },
                fv_wystawiona: { active: 'bg-pink-500 text-white', inactive: 'bg-pink-50 text-pink-600 hover:bg-pink-100' },
                niezapłacone: { active: 'bg-red-500 text-white', inactive: 'bg-red-50 text-red-600 hover:bg-red-100' },
              }
              const colors = tabColors[t]
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === t ? colors.active : colors.inactive
                  }`}
                >
                  {t === 'niezapłacone' ? 'Niezapłacone' : statusLabels[t as OrderStatus]}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" />
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden max-w-5xl">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <SortHeader label="#" sortKey="number" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Przyjęto" sortKey="accepted_date" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Klient" sortKey="client" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Opis</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Kolor</th>
                <SortHeader label="Status" sortKey="status" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Wartość" sortKey="value" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="px-2 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">Zam.</th>
                <SortHeader label="Plan" sortKey="planned_date" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Gotowe" sortKey="ready_date" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const value = getOrderValue(order as unknown as Record<string, unknown>, handlePrice, wplykaPrice, colorSurchargePrice)
                const overdue = isOverdue(order)
                return (
                  <tr key={order.id} onClick={() => navigate(`/zamowienia/${order.id}`)} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${overdue ? 'bg-red-50/50' : ''}`}>
                    <td className="px-2 py-0.5 font-medium text-amber-600 tabular-nums">
                      {order.number}/{new Date(order.created_at).getFullYear() % 100}
                    </td>
                    <td className="px-2 py-0.5 text-gray-500 tabular-nums">
                      {order.accepted_date ? new Date(order.accepted_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td className="px-2 py-0.5 text-gray-800 font-medium">
                      <span className="flex items-center gap-1">
                        {getClient(order as unknown as Record<string, unknown>)?.type === 'company' ? <Building2 className="h-3 w-3 text-blue-500 flex-shrink-0" /> : <User className="h-3 w-3 text-violet-500 flex-shrink-0" />}
                        {getClient(order as unknown as Record<string, unknown>)?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-2 py-0.5 text-gray-600 max-w-[180px] truncate">{order.description || '—'}</td>
                    <td className="px-2 py-0.5 text-gray-600"><span className="flex items-center gap-1"><ColorSwatch color={order.color} size="sm" />{order.color || '—'}</span></td>
                    <td className="px-2 py-0.5">
                      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="px-2 py-0.5 text-right font-semibold text-amber-600 tabular-nums">
                      {value > 0 ? value.toFixed(0) : '—'}
                    </td>
                    <td className="px-2 py-0.5 text-center">
                      {(!order.material_provided || !order.paints_provided) && order.status !== 'gotowe' && order.status !== 'wydane' && order.status !== 'fv_wystawiona' && order.status !== 'zapłacone' ? (
                        <span className="inline-flex gap-0.5">
                          {!order.material_provided && <span className="text-[9px] font-bold text-red-500 bg-red-50 rounded px-1">M</span>}
                          {!order.paints_provided && <span className="text-[9px] font-bold text-red-500 bg-red-50 rounded px-1">L</span>}
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-500">✓</span>
                      )}
                    </td>
                    <td className={`px-2 py-1.5 tabular-nums ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {order.planned_date ? new Date(order.planned_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }) : '—'}
                      {overdue && <span className="ml-0.5 text-[10px]">!</span>}
                    </td>
                    <td className="px-2 py-0.5 tabular-nums text-emerald-600 font-medium">
                      {order.ready_date ? new Date(order.ready_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }) : ''}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-2 py-8 text-center text-xs text-gray-400">
                    {search ? 'Brak wyników' : 'Brak zamówień'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-3 py-2">
              <span className="text-[11px] text-gray-500">
                {filtered.length} {filtered.length === 1 ? 'zamówienie' : filtered.length < 5 ? 'zamówienia' : 'zamówień'}
              </span>
              <span className="text-[11px] font-bold text-amber-600 tabular-nums">
                {totalValue.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
              </span>
            </div>
          )}
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
      className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {active && (dir === 'asc' ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />)}
      </span>
    </th>
  )
}
