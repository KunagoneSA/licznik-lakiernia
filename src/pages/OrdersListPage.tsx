import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronUp, ChevronDown } from 'lucide-react'
import { useOrders } from '../hooks/useOrders'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import type { Order, OrderStatus } from '../types/database'
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

const statusOptions: OrderStatus[] = ['nowe', 'w_trakcie', 'gotowe', 'wydane', 'zapłacone']

const tabs = ['wszystkie', 'nowe', 'w_trakcie', 'gotowe', 'wydane', 'niezapłacone'] as const

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
  const navigate = useNavigate()
  const { orders, loading, refetch } = useOrders()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<string>('wszystkie')
  const [showNew, setShowNew] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('number')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [eDesc, setEDesc] = useState('')
  const [eColor, setEColor] = useState('')
  const [eStatus, setEStatus] = useState<OrderStatus>('nowe')
  const [ePlanned, setEPlanned] = useState('')
  const [eNotes, setENotes] = useState('')
  const editRowRef = useRef<HTMLTableRowElement>(null)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'number' ? 'desc' : 'asc')
    }
  }

  const startEdit = (order: Order) => {
    if (editingId === order.id) return
    // Save previous if editing
    if (editingId) saveEdit()
    setEditingId(order.id)
    setEDesc(order.description ?? '')
    setEColor(order.color ?? '')
    setEStatus(order.status)
    setEPlanned(order.planned_date ?? '')
    setENotes(order.notes ?? '')
  }

  const saveEdit = useCallback(async () => {
    if (!editingId) return
    await supabase.from('orders').update({
      description: eDesc.trim() || null,
      color: eColor.trim() || null,
      status: eStatus,
      planned_date: ePlanned || null,
      notes: eNotes.trim() || null,
    }).eq('id', editingId)
    setEditingId(null)
    refetch()
  }, [editingId, eDesc, eColor, eStatus, ePlanned, eNotes, refetch])

  const cancelEdit = () => {
    setEditingId(null)
  }

  const handleRowBlur = useCallback((e: React.FocusEvent) => {
    const row = editRowRef.current
    if (!row) return
    if (e.relatedTarget && row.contains(e.relatedTarget as Node)) return
    requestAnimationFrame(() => {
      if (row.contains(document.activeElement)) return
      saveEdit()
    })
  }, [saveEdit])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit() }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }

  const filtered = useMemo(() => {
    const list = orders.filter((o) => {
      if (tab === 'niezapłacone' && o.status !== 'wydane') return false
      else if (tab !== 'wszystkie' && tab !== 'niezapłacone' && o.status !== tab) return false
      if (search) {
        const q = search.toLowerCase()
        const clientName = getClientName(o as unknown as Record<string, unknown>).toLowerCase()
        return clientName.includes(q) || (o.description ?? '').toLowerCase().includes(q) || String(o.number).includes(q) || (o.color ?? '').toLowerCase().includes(q)
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

  const ic = "w-full rounded border border-gray-300 px-1.5 py-1 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30"

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 max-w-4xl">
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
            placeholder="Szukaj klienta, opisu, koloru lub numeru..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-white border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
        <div className="flex gap-1">
          {tabs.map((t) => {
            const tabColors: Record<string, { active: string; inactive: string }> = {
              wszystkie: { active: 'bg-gray-700 text-white', inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
              nowe: { active: 'bg-blue-500 text-white', inactive: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
              w_trakcie: { active: 'bg-amber-500 text-white', inactive: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
              gotowe: { active: 'bg-emerald-500 text-white', inactive: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
              wydane: { active: 'bg-violet-500 text-white', inactive: 'bg-violet-50 text-violet-600 hover:bg-violet-100' },
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
                {t === 'wszystkie' ? 'Wszystkie' : t === 'niezapłacone' ? 'Niezapłacone' : statusLabels[t as OrderStatus]}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" />
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden max-w-4xl">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <SortHeader label="#" sortKey="number" currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="w-16" />
                <SortHeader label="Klient" sortKey="client" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Opis</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase w-24">Kolor</th>
                <SortHeader label="Status" sortKey="status" currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="w-24" />
                <SortHeader label="Wartość" sortKey="value" currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="w-20" />
                <th className="px-2 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase w-12">Zam.</th>
                <SortHeader label="Termin" sortKey="planned_date" currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const value = getOrderValue(order as unknown as Record<string, unknown>)
                const overdue = isOverdue(order)
                const isEditing = editingId === order.id

                if (isEditing) {
                  return (
                    <tr
                      key={order.id}
                      ref={editRowRef}
                      onBlur={handleRowBlur}
                      onKeyDown={handleKeyDown}
                      className="border-b border-gray-100 bg-amber-50/50"
                    >
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => navigate(`/zamowienia/${order.id}`)}
                          className="font-medium text-amber-600 hover:underline tabular-nums"
                        >
                          {order.number}/{new Date(order.created_at).getFullYear() % 100}
                        </button>
                      </td>
                      <td className="px-2 py-1.5 text-gray-800 font-medium">
                        {getClientName(order as unknown as Record<string, unknown>)}
                      </td>
                      <td className="px-2 py-1">
                        <input value={eDesc} onChange={(e) => setEDesc(e.target.value)} className={ic} placeholder="Opis..." />
                      </td>
                      <td className="px-2 py-1">
                        <input value={eColor} onChange={(e) => setEColor(e.target.value)} className={ic} placeholder="Kolor..." />
                      </td>
                      <td className="px-2 py-1">
                        <select value={eStatus} onChange={(e) => setEStatus(e.target.value as OrderStatus)} className={ic}>
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>{statusLabels[s]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold text-amber-600 tabular-nums">
                        {value > 0 ? value.toFixed(0) : '—'}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {(!order.material_provided || !order.paints_provided) && order.status !== 'gotowe' && order.status !== 'wydane' && order.status !== 'zapłacone' ? (
                          <span className="inline-flex gap-0.5">
                            {!order.material_provided && <span className="text-[9px] font-bold text-red-500 bg-red-50 rounded px-1">M</span>}
                            {!order.paints_provided && <span className="text-[9px] font-bold text-red-500 bg-red-50 rounded px-1">L</span>}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-500">✓</span>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <input type="date" value={ePlanned} onChange={(e) => setEPlanned(e.target.value)} className={ic} />
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr
                    key={order.id}
                    onClick={() => startEdit(order)}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${overdue ? 'bg-red-50/50' : ''}`}
                  >
                    <td className="px-2 py-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/zamowienia/${order.id}`) }}
                        className="font-medium text-amber-600 hover:underline tabular-nums"
                      >
                        {order.number}/{new Date(order.created_at).getFullYear() % 100}
                      </button>
                    </td>
                    <td className="px-2 py-1.5 text-gray-800 font-medium">{getClientName(order as unknown as Record<string, unknown>)}</td>
                    <td className="px-2 py-1.5 text-gray-600 max-w-[180px] truncate">{order.description || '—'}</td>
                    <td className="px-2 py-1.5 text-gray-600">{order.color || '—'}</td>
                    <td className="px-2 py-1.5">
                      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold text-amber-600 tabular-nums">
                      {value > 0 ? value.toFixed(0) : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {(!order.material_provided || !order.paints_provided) && order.status !== 'gotowe' && order.status !== 'wydane' && order.status !== 'zapłacone' ? (
                        <span className="inline-flex gap-0.5">
                          {!order.material_provided && <span className="text-[9px] font-bold text-red-500 bg-red-50 rounded px-1">M</span>}
                          {!order.paints_provided && <span className="text-[9px] font-bold text-red-500 bg-red-50 rounded px-1">L</span>}
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-500">✓</span>
                      )}
                    </td>
                    <td className={`px-2 py-1.5 tabular-nums ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {order.planned_date ? new Date(order.planned_date).toLocaleDateString('pl-PL') : '—'}
                      {overdue && <span className="ml-0.5 text-[10px]">!</span>}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-2 py-8 text-center text-xs text-gray-400">
                    {search ? 'Brak wyników' : 'Brak zamówień'}
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

function SortHeader({ label, sortKey, currentKey, dir, onSort, className }: {
  label: string; sortKey: SortKey; currentKey: SortKey; dir: SortDir; onSort: (k: SortKey) => void; className?: string
}) {
  const active = sortKey === currentKey
  return (
    <th
      className={`px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700 ${className ?? ''}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {active && (dir === 'asc' ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />)}
      </span>
    </th>
  )
}
