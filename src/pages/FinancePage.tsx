import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Plus, Trash2, X, ChevronLeft, ChevronRight, Copy } from 'lucide-react'

const MONTH_NAMES = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']

import { supabase } from '../lib/supabase'
import { useWorkLogs } from '../hooks/useWorkLogs'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { PaintPurchase } from '../types/database'

function fmtPL(n: number, d = 2) {
  return n.toFixed(d).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

interface OrderWithItems {
  id: string; number: number; status: string; created_at: string; ready_date: string | null
  client: { name: string } | null; order_items: { total_price: number; m2: number }[]
}

export default function FinancePage() {
  const { isAdmin, user } = useAuth()
  if (!isAdmin) return <Navigate to="/" replace />

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

  const shiftMonth = (dir: number) => {
    let m = month + dir, y = year
    if (m < 0) { m = 11; y-- } if (m > 11) { m = 0; y++ }
    setMonth(m); setYear(y)
  }

  const { logs } = useWorkLogs()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [purchases, setPurchases] = useState<PaintPurchase[]>([])
  const [extraCosts, setExtraCosts] = useState<{ id: string; date: string; description: string; amount: number; created_by_email: string | null }[]>([])
  const [fixedCosts, setFixedCosts] = useState<{ id: string; month: string; name: string; amount: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [newExtraDesc, setNewExtraDesc] = useState('')
  const [newExtraAmount, setNewExtraAmount] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [editExtraId, setEditExtraId] = useState<string | null>(null)
  const [editExtraDesc, setEditExtraDesc] = useState('')
  const [editExtraAmount, setEditExtraAmount] = useState('')
  const [newFixedName, setNewFixedName] = useState('')
  const [newFixedAmount, setNewFixedAmount] = useState('')
  const [editFixedId, setEditFixedId] = useState<string | null>(null)
  const [editFixedName, setEditFixedName] = useState('')
  const [editFixedAmount, setEditFixedAmount] = useState('')
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [ordersRes, purchasesRes, extraRes, fixedRes] = await Promise.all([
      supabase.from('orders').select('id, number, status, created_at, ready_date, client:clients(name), order_items(total_price, m2)')
        .in('status', ['gotowe', 'wydane', 'fv_wystawiona', 'zapłacone']),
      supabase.from('paint_purchases').select('*, supplier:suppliers(name)').gte('date', dateFrom).lte('date', dateTo).order('date', { ascending: false }),
      supabase.from('extra_costs').select('*').gte('date', dateFrom).lte('date', dateTo).order('date', { ascending: true }),
      supabase.from('fixed_costs').select('*').eq('month', `${year}-${String(month + 1).padStart(2, '0')}`).order('name'),
    ])
    const allOrders = (ordersRes.data as unknown as OrderWithItems[]) ?? []
    setOrders(allOrders.filter(o => {
      if (o.ready_date) return o.ready_date >= dateFrom && o.ready_date <= dateTo
      return false
    }))
    setPurchases((purchasesRes.data as PaintPurchase[]) ?? [])
    setExtraCosts((extraRes?.data ?? []) as { id: string; date: string; description: string; amount: number; created_by_email: string | null }[])
    setFixedCosts((fixedRes?.data ?? []) as { id: string; month: string; name: string; amount: number }[])
    setLoading(false)
  }, [dateFrom, dateTo])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredLogs = useMemo(() => logs.filter((l) => l.date >= dateFrom && l.date <= dateTo), [logs, dateFrom, dateTo])
  const filteredPurchases = purchases

  const HOURLY_RATE = 45
  const revenue = useMemo(() => orders.reduce((s, o) => s + o.order_items.reduce((si, i) => si + Number(i.total_price), 0), 0), [orders])
  const totalM2 = useMemo(() => orders.reduce((s, o) => s + o.order_items.reduce((si, i) => si + Number(i.m2), 0), 0), [orders])
  const laborCost = useMemo(() => filteredLogs.reduce((s, l) => s + Number(l.hours) * HOURLY_RATE, 0), [filteredLogs])
  const totalHours = useMemo(() => filteredLogs.reduce((s, l) => s + Number(l.hours), 0), [filteredLogs])
  const materialCost = useMemo(() => filteredPurchases.filter(p => (p as unknown as { in_report?: boolean }).in_report !== false).reduce((s, p) => s + Number(p.total), 0), [filteredPurchases])
  const extraCostTotal = useMemo(() => extraCosts.reduce((s, c) => s + Number(c.amount), 0), [extraCosts])
  const fixedCostTotal = useMemo(() => fixedCosts.reduce((s, c) => s + Number(c.amount), 0), [fixedCosts])
  const totalCosts = laborCost + materialCost + extraCostTotal + fixedCostTotal
  const profit = revenue - totalCosts

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const prevMonthKey = (() => {
    let m = month - 1, y = year
    if (m < 0) { m = 11; y-- }
    return `${y}-${String(m + 1).padStart(2, '0')}`
  })()
  const copyFromPrevMonth = async () => {
    const { data: prev } = await supabase.from('fixed_costs').select('name, amount').eq('month', prevMonthKey)
    if (!prev || prev.length === 0) { toast('Brak kosztów w poprzednim miesiącu'); return }
    await supabase.from('fixed_costs').insert(prev.map(c => ({ month: monthKey, name: c.name, amount: c.amount })))
    toast(`Skopiowano ${prev.length} pozycji`); fetchData()
  }
  const addFixedCost = async () => {
    if (!newFixedName || !newFixedAmount) return
    await supabase.from('fixed_costs').insert({ month: monthKey, name: newFixedName, amount: Math.round(Number(newFixedAmount) * 100) / 100 })
    setNewFixedName(''); setNewFixedAmount(''); toast('Koszt dodany'); fetchData()
  }
  const startEditFixed = (c: { id: string; name: string; amount: number }) => {
    setEditFixedId(c.id); setEditFixedName(c.name); setEditFixedAmount(String(c.amount))
  }
  const saveEditFixed = async () => {
    if (!editFixedId || !editFixedName || !editFixedAmount) return
    await supabase.from('fixed_costs').update({ name: editFixedName, amount: Math.round(Number(editFixedAmount) * 100) / 100 }).eq('id', editFixedId)
    setEditFixedId(null); toast('Zaktualizowano'); fetchData()
  }
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0

  const workerStats = useMemo(() => {
    const map = new Map<string, { hours: number; cost: number }>()
    filteredLogs.forEach((l) => {
      const cur = map.get(l.worker_name) ?? { hours: 0, cost: 0 }
      cur.hours += Number(l.hours)
      cur.cost += Number(l.hours) * HOURLY_RATE
      map.set(l.worker_name, cur)
    })
    return Array.from(map.entries()).sort((a, b) => b[1].cost - a[1].cost)
  }, [filteredLogs])

  const supplierStats = useMemo(() => {
    const map = new Map<string, { total: number; count: number; products: Set<string> }>()
    filteredPurchases.forEach((p) => {
      const name = (p as unknown as { supplier?: { name: string } }).supplier?.name ?? 'Nieznany'
      const cur = map.get(name) ?? { total: 0, count: 0, products: new Set<string>() }
      cur.total += Number(p.total)
      cur.count += 1
      if (p.product) cur.products.add(p.product)
      map.set(name, cur)
    })
    return Array.from(map.entries()).map(([name, s]) => [name, { ...s, products: [...s.products].sort().join(', ') }] as const).sort((a, b) => b[1].total - a[1].total)
  }, [filteredPurchases])

  const orderRanking = useMemo(() =>
    orders.map((o) => ({
      number: o.number, year: new Date(o.created_at).getFullYear() % 100,
      client: o.client?.name ?? '—',
      revenue: o.order_items.reduce((s, i) => s + Number(i.total_price), 0),
      m2: o.order_items.reduce((s, i) => s + Number(i.m2), 0),
    })).filter((o) => o.revenue > 0).sort((a, b) => b.revenue - a.revenue),
  [orders])

  const startEditExtra = (c: { id: string; description: string; amount: number }) => {
    setEditExtraId(c.id); setEditExtraDesc(c.description); setEditExtraAmount(String(c.amount))
  }
  const saveEditExtra = async () => {
    if (!editExtraId || !editExtraDesc || !editExtraAmount) return
    await supabase.from('extra_costs').update({ description: editExtraDesc, amount: Math.round(Number(editExtraAmount) * 100) / 100 }).eq('id', editExtraId)
    setEditExtraId(null); toast('Koszt zaktualizowany'); fetchData()
  }
  const addExtraCost = async () => {
    if (!newExtraDesc || !newExtraAmount) return
    await supabase.from('extra_costs').insert({ date: dateFrom, description: newExtraDesc, amount: Math.round(Number(newExtraAmount) * 100) / 100, created_by_email: user?.email ?? null })
    setNewExtraDesc(''); setNewExtraAmount(''); toast('Koszt dodany'); fetchData()
  }

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" /></div>

  return (
    <div className="space-y-4 max-w-4xl mx-auto print:space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900 border-b-2 border-amber-500 pb-1">Raport finansowy</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => shiftMonth(-1)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 print:hidden"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-[140px] text-center text-sm font-semibold text-gray-800">{MONTH_NAMES[month]} {year}</span>
          <button onClick={() => shiftMonth(1)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 print:hidden"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Summary table — compact for PDF */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-gray-100 bg-emerald-50/50">
              <td className="px-4 py-2 font-semibold text-gray-700">Przychody (zamówienia gotowe)</td>
              <td className="px-4 py-2 text-right font-bold text-emerald-700 tabular-nums">{fmtPL(revenue)} zł</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-2 text-gray-600 pl-8">Zamówień: {orders.length} | m²: {fmtPL(totalM2)}</td>
              <td></td>
            </tr>
            <tr className="border-b border-gray-100 bg-red-50/30">
              <td className="px-4 py-2 font-semibold text-gray-700">Koszty pracy</td>
              <td className="px-4 py-2 text-right font-bold text-red-600 tabular-nums">- {fmtPL(laborCost)} zł</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-2 text-gray-600 pl-8">{fmtPL(totalHours, 1)} h × {HOURLY_RATE} zł/h</td>
              <td></td>
            </tr>
            <tr className="border-b border-gray-100 bg-orange-50/30">
              <td className="px-4 py-2 font-semibold text-gray-700">Koszty materiałów</td>
              <td className="px-4 py-2 text-right font-bold text-orange-600 tabular-nums">- {fmtPL(materialCost)} zł</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-2 text-gray-600 pl-8">{filteredPurchases.length} zakupów w okresie</td>
              <td></td>
            </tr>
            {fixedCostTotal > 0 && (
              <>
                <tr className="border-b border-gray-100 bg-purple-50/30">
                  <td className="px-4 py-2 font-semibold text-gray-700">Koszty stałe</td>
                  <td className="px-4 py-2 text-right font-bold text-purple-600 tabular-nums">- {fmtPL(fixedCostTotal)} zł</td>
                </tr>
                {fixedCosts.map(c => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="px-4 py-1 text-gray-500 pl-8 text-xs">{c.name}</td>
                    <td className="px-4 py-1 text-right text-gray-500 text-xs tabular-nums">{fmtPL(Number(c.amount))} zł</td>
                  </tr>
                ))}
              </>
            )}
            {extraCostTotal > 0 && (
              <>
                <tr className="border-b border-gray-100 bg-rose-50/30">
                  <td className="px-4 py-2 font-semibold text-gray-700">Dodatkowe koszty</td>
                  <td className="px-4 py-2 text-right font-bold text-rose-600 tabular-nums">- {fmtPL(extraCostTotal)} zł</td>
                </tr>
                {extraCosts.map(c => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="px-4 py-1 text-gray-500 pl-8 text-xs">{c.description}</td>
                    <td className="px-4 py-1 text-right text-gray-500 text-xs tabular-nums">{fmtPL(Number(c.amount))} zł</td>
                  </tr>
                ))}
              </>
            )}
            <tr className={`border-t-2 border-gray-300 ${profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <td className="px-4 py-3 font-bold text-gray-900 text-base">WYNIK</td>
              <td className={`px-4 py-3 text-right font-bold text-base tabular-nums ${profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {fmtPL(profit)} zł <span className="text-xs font-normal text-gray-500">({fmtPL(margin, 1)}%)</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Cost structure bar */}
      {revenue > 0 && (
        <div className="rounded-lg bg-white border border-gray-200 p-3">
          <div className="flex h-5 w-full overflow-hidden rounded-full bg-gray-200">
            {laborCost > 0 && <div className="bg-red-500" style={{ width: `${(laborCost / revenue) * 100}%` }} />}
            {materialCost > 0 && <div className="bg-orange-500" style={{ width: `${(materialCost / revenue) * 100}%` }} />}
            {fixedCostTotal > 0 && <div className="bg-purple-500" style={{ width: `${(fixedCostTotal / revenue) * 100}%` }} />}
            {extraCostTotal > 0 && <div className="bg-rose-500" style={{ width: `${(extraCostTotal / revenue) * 100}%` }} />}
            {profit > 0 && <div className="bg-emerald-500" style={{ width: `${(profit / revenue) * 100}%` }} />}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Praca {((laborCost / revenue) * 100).toFixed(0)}%</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> Materiały {((materialCost / revenue) * 100).toFixed(0)}%</span>
            {fixedCostTotal > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" /> Stałe {((fixedCostTotal / revenue) * 100).toFixed(0)}%</span>}
            {extraCostTotal > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Dodatkowe {((extraCostTotal / revenue) * 100).toFixed(0)}%</span>}
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Zysk {((profit / revenue) * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* Two columns: Workers + Orders */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-2 print:gap-2">
        {/* Workers */}
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">Koszty pracy</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-3 py-1.5 text-left font-medium text-gray-500">Pracownik</th>
                <th className="px-3 py-1.5 text-right font-medium text-gray-500">Godz.</th>
                <th className="px-3 py-1.5 text-right font-medium text-gray-500">Koszt</th>
              </tr>
            </thead>
            <tbody>
              {workerStats.map(([name, s], i) => (
                <tr key={name} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                  <td className="px-3 py-1 text-gray-800 font-medium">{name}</td>
                  <td className="px-3 py-1 text-right text-gray-600 tabular-nums">{fmtPL(s.hours, 1)}</td>
                  <td className="px-3 py-1 text-right text-red-600 tabular-nums">{fmtPL(s.cost, 0)} zł</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                <td className="px-3 py-1.5 text-gray-700">Razem</td>
                <td className="px-3 py-1.5 text-right text-gray-700 tabular-nums">{fmtPL(totalHours, 1)}</td>
                <td className="px-3 py-1.5 text-right text-red-600 tabular-nums">{fmtPL(laborCost, 0)} zł</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Orders */}
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">Zamówienia</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-3 py-1.5 text-left font-medium text-gray-500">Nr</th>
                <th className="px-3 py-1.5 text-left font-medium text-gray-500">Klient</th>
                <th className="px-3 py-1.5 text-right font-medium text-gray-500">m²</th>
                <th className="px-3 py-1.5 text-right font-medium text-gray-500">Przychód</th>
              </tr>
            </thead>
            <tbody>
              {orderRanking.map((o, i) => (
                <tr key={o.number} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                  <td className="px-3 py-1 text-amber-600 font-medium">{o.number}/{o.year}</td>
                  <td className="px-3 py-1 text-gray-800">{o.client}</td>
                  <td className="px-3 py-1 text-right text-gray-600 tabular-nums">{fmtPL(o.m2)}</td>
                  <td className="px-3 py-1 text-right text-emerald-600 tabular-nums">{fmtPL(o.revenue, 0)} zł</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                <td className="px-3 py-1.5 text-gray-700" colSpan={2}>Razem</td>
                <td className="px-3 py-1.5 text-right text-gray-700 tabular-nums">{fmtPL(totalM2)}</td>
                <td className="px-3 py-1.5 text-right text-emerald-600 tabular-nums">{fmtPL(revenue, 0)} zł</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchases */}
      {filteredPurchases.length > 0 && (() => {
        const supplierNames = [...new Set(filteredPurchases.map(p => (p as unknown as { supplier?: { name: string } }).supplier?.name ?? 'Nieznany'))].sort()
        const displayPurchases = supplierFilter ? filteredPurchases.filter(p => (p as unknown as { supplier?: { name: string } }).supplier?.name === supplierFilter) : filteredPurchases
        const reportPurchases = displayPurchases.filter(p => (p as unknown as { in_report?: boolean }).in_report !== false)
        const displayTotal = reportPurchases.reduce((s, p) => s + Number(p.total), 0)
        return (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="bg-gray-50 px-3 py-1.5 flex items-center justify-between border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Zakupy lakierów i materiałów</span>
            <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}
              className="text-xs bg-white border border-gray-300 rounded px-2 py-0.5 text-gray-700 outline-none focus:border-amber-500 print:hidden">
              <option value="">Wszyscy dostawcy</option>
              {supplierNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-1 py-1.5 text-center font-medium text-gray-500 print:hidden">✓</th>
                <th className="px-3 py-1.5 text-left font-medium text-gray-500">Data</th>
                <th className="px-3 py-1.5 text-left font-medium text-gray-500">Produkt</th>
                <th className="px-3 py-1.5 text-right font-medium text-gray-500">Ilość</th>
                <th className="px-3 py-1.5 text-right font-medium text-gray-500">Kwota</th>
              </tr>
            </thead>
            <tbody>
              {displayPurchases.map((p, i) => (
                <tr key={p.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/30' : ''} ${(p as unknown as { in_report?: boolean }).in_report === false ? 'opacity-40' : ''}`}>
                  <td className="px-1 py-1 text-center print:hidden">
                    <input type="checkbox" checked={(p as unknown as { in_report?: boolean }).in_report !== false}
                      onChange={async (e) => {
                        await supabase.from('paint_purchases').update({ in_report: e.target.checked }).eq('id', p.id)
                        fetchData()
                      }}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-amber-500 focus:ring-amber-500/30 cursor-pointer" />
                  </td>
                  <td className="px-3 py-1 text-gray-600">{p.date}</td>
                  <td className="px-3 py-1 text-gray-800">{p.product}{p.color ? ` (${p.color})` : ''}</td>
                  <td className="px-3 py-1 text-right text-gray-600">{p.quantity} {p.unit}</td>
                  <td className="px-3 py-1 text-right text-orange-600 tabular-nums">{fmtPL(Number(p.total))} zł</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                <td className="print:hidden"></td>
                <td className="px-3 py-1.5 text-gray-700" colSpan={3}>Razem{supplierFilter ? ` (${supplierFilter})` : ''}</td>
                <td className="px-3 py-1.5 text-right text-orange-600 tabular-nums">{fmtPL(displayTotal)} zł</td>
              </tr>
            </tbody>
          </table>
        </div>
        )
      })()}

      {/* Purchases by supplier */}
      {supplierStats.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">Zakupy wg dostawcy</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-3 py-1.5 text-left font-medium text-gray-500">Dostawca</th>
                <th className="px-3 py-1.5 text-left font-medium text-gray-500">Produkty</th>
                <th className="px-3 py-1.5 text-right font-medium text-gray-500">Zakupów</th>
                <th className="px-3 py-1.5 text-right font-medium text-gray-500">Kwota</th>
                <th className="px-3 py-1.5 text-right font-medium text-gray-500">Udział</th>
              </tr>
            </thead>
            <tbody>
              {supplierStats.map(([name, s], i) => (
                <tr key={name} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                  <td className="px-3 py-1 text-gray-800 font-medium">{name}</td>
                  <td className="px-3 py-1 text-gray-500 text-[10px] max-w-[200px]">{s.products}</td>
                  <td className="px-3 py-1 text-right text-gray-600 tabular-nums">{s.count}</td>
                  <td className="px-3 py-1 text-right text-orange-600 tabular-nums">{fmtPL(s.total)} zł</td>
                  <td className="px-3 py-1 text-right text-gray-500 tabular-nums">{materialCost > 0 ? ((s.total / materialCost) * 100).toFixed(0) : 0}%</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                <td className="px-3 py-1.5 text-gray-700">Razem</td>
                <td></td>
                <td className="px-3 py-1.5 text-right text-gray-700 tabular-nums">{filteredPurchases.length}</td>
                <td className="px-3 py-1.5 text-right text-orange-600 tabular-nums">{fmtPL(materialCost)} zł</td>
                <td className="px-3 py-1.5 text-right text-gray-500">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Fixed costs — editable */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="bg-gray-50 px-3 py-1.5 flex items-center justify-between border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Koszty stałe — {MONTH_NAMES[month]} {year}</span>
          {fixedCosts.length === 0 && (
            <button onClick={copyFromPrevMonth} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 print:hidden">
              <Copy className="h-3 w-3" /> Kopiuj z poprzedniego miesiąca
            </button>
          )}
        </div>
        <table className="w-full text-xs">
          <tbody>
            {fixedCosts.map((c, idx) => (
              editFixedId === c.id ? (
                <tr key={c.id} className="border-b border-gray-50 bg-blue-50/30"
                  onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) saveEditFixed() }}>
                  <td className="px-3 py-1.5">
                    <input type="text" value={editFixedName} onChange={(e) => setEditFixedName(e.target.value)}
                      className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500"
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEditFixed(); if (e.key === 'Escape') setEditFixedId(null) }} autoFocus />
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="number" value={editFixedAmount} onChange={(e) => setEditFixedAmount(e.target.value)}
                      className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-right text-gray-800 outline-none focus:border-amber-500"
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEditFixed(); if (e.key === 'Escape') setEditFixedId(null) }} />
                  </td>
                  <td className="px-1 py-1.5 w-6 print:hidden">
                    <button onClick={() => setEditFixedId(null)} className="rounded p-0.5 text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                  </td>
                </tr>
              ) : (
                <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${idx % 2 === 1 ? 'bg-gray-50/30' : ''}`} onClick={() => startEditFixed(c)}>
                  <td className="px-3 py-1.5 text-gray-800">{c.name}</td>
                  <td className="px-3 py-1.5 text-right text-purple-600 tabular-nums w-28">{fmtPL(Number(c.amount))} zł</td>
                  <td className="px-1 py-1.5 w-6 print:hidden" onClick={(e) => e.stopPropagation()}>
                    <button onClick={async () => {
                      await supabase.from('fixed_costs').delete().eq('id', c.id)
                      toast('Usunięto'); fetchData()
                    }} className="rounded p-0.5 text-gray-300 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                  </td>
                </tr>
              )
            ))}
            {fixedCosts.length > 0 && (
              <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                <td className="px-3 py-1.5 text-gray-700">Razem</td>
                <td className="px-3 py-1.5 text-right text-purple-600 tabular-nums">{fmtPL(fixedCostTotal)} zł</td>
                <td className="print:hidden"></td>
              </tr>
            )}
            {/* Inline add */}
            <tr className="border-t border-gray-200 bg-amber-50/30 print:hidden">
              <td className="px-3 py-1.5">
                <input type="text" placeholder="Nazwa kosztu..." value={newFixedName} onChange={(e) => setNewFixedName(e.target.value)}
                  className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') addFixedCost() }} />
              </td>
              <td className="px-3 py-1.5">
                <input type="number" placeholder="0,00" value={newFixedAmount} onChange={(e) => setNewFixedAmount(e.target.value)}
                  className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-right text-gray-800 outline-none focus:border-amber-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') addFixedCost() }} />
              </td>
              <td className="px-1 py-1.5 print:hidden">
                <button onClick={addFixedCost} disabled={!newFixedName || !newFixedAmount}
                  className="rounded p-0.5 text-amber-500 hover:text-amber-700 disabled:opacity-30"><Plus className="h-3 w-3" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Extra costs — editable */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">Dodatkowe koszty</div>
        <table className="w-full text-xs">
          <tbody>
            {extraCosts.map((c) => (
              editExtraId === c.id ? (
                <tr key={c.id} className="border-b border-gray-50 bg-blue-50/30"
                  onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) saveEditExtra() }}>
                  <td className="px-3 py-1.5 text-gray-400 text-[10px] w-20">{(c.created_by_email ?? '').split('@')[0]}</td>
                  <td className="px-3 py-1.5 text-gray-600 w-24">{c.date}</td>
                  <td className="px-3 py-1.5">
                    <input type="text" value={editExtraDesc} onChange={(e) => setEditExtraDesc(e.target.value)}
                      className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500"
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEditExtra(); if (e.key === 'Escape') setEditExtraId(null) }} autoFocus />
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="number" value={editExtraAmount} onChange={(e) => setEditExtraAmount(e.target.value)}
                      className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-right text-gray-800 outline-none focus:border-amber-500"
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEditExtra(); if (e.key === 'Escape') setEditExtraId(null) }} />
                  </td>
                  <td className="px-1 py-1.5 w-6 print:hidden">
                    <button onClick={() => setEditExtraId(null)} className="rounded p-0.5 text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                  </td>
                </tr>
              ) : (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer print:cursor-default" onClick={() => startEditExtra(c)}>
                  <td className="px-3 py-1.5 text-gray-400 text-[10px] w-20">{(c.created_by_email ?? '').split('@')[0]}</td>
                  <td className="px-3 py-1.5 text-gray-600 w-24">{c.date}</td>
                  <td className="px-3 py-1.5 text-gray-800">{c.description}</td>
                  <td className="px-3 py-1.5 text-right text-rose-600 tabular-nums w-28">{fmtPL(Number(c.amount))} zł</td>
                  <td className="px-1 py-1.5 w-6 print:hidden" onClick={(e) => e.stopPropagation()}>
                    <button onClick={async () => {
                      await supabase.from('extra_costs').delete().eq('id', c.id)
                      toast('Koszt usunięty'); fetchData()
                    }} className="rounded p-0.5 text-gray-300 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                  </td>
                </tr>
              )
            ))}
            {extraCosts.length > 0 && (
              <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                <td className="px-3 py-1.5 text-gray-700" colSpan={2}>Razem</td>
                <td className="px-3 py-1.5 text-right text-rose-600 tabular-nums">{fmtPL(extraCostTotal)} zł</td>
                <td className="print:hidden"></td>
              </tr>
            )}
            {/* Inline add */}
            <tr className="border-t border-gray-200 bg-amber-50/30 print:hidden">
              <td className="px-3 py-1.5 text-[10px] text-gray-400">{dateFrom}</td>
              <td className="px-3 py-1.5">
                <input type="text" placeholder="Opis kosztu..." value={newExtraDesc} onChange={(e) => setNewExtraDesc(e.target.value)}
                  className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') addExtraCost() }} />
              </td>
              <td className="px-3 py-1.5">
                <input type="number" placeholder="0,00" value={newExtraAmount} onChange={(e) => setNewExtraAmount(e.target.value)}
                  className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-right text-gray-800 outline-none focus:border-amber-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') addExtraCost() }} />
              </td>
              <td className="px-1 py-1.5">
                <button onClick={addExtraCost} disabled={!newExtraDesc || !newExtraAmount}
                  className="rounded p-0.5 text-amber-500 hover:text-amber-700 disabled:opacity-30"><Plus className="h-3 w-3" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
