import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

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
  const { isAdmin } = useAuth()
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
  const [extraCosts, setExtraCosts] = useState<{ id: string; date: string; description: string; amount: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [newExtraDesc, setNewExtraDesc] = useState('')
  const [newExtraAmount, setNewExtraAmount] = useState('')
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [ordersRes, purchasesRes, extraRes] = await Promise.all([
      supabase.from('orders').select('id, number, status, created_at, ready_date, client:clients(name), order_items(total_price, m2)')
        .in('status', ['gotowe', 'wydane', 'fv_wystawiona', 'zapłacone']),
      supabase.from('paint_purchases').select('*').order('date', { ascending: false }),
      supabase.from('extra_costs').select('*').gte('date', dateFrom).lte('date', dateTo).order('date', { ascending: true }),
    ])
    const allOrders = (ordersRes.data as unknown as OrderWithItems[]) ?? []
    setOrders(allOrders.filter(o => {
      if (o.ready_date) return o.ready_date >= dateFrom && o.ready_date <= dateTo
      return false
    }))
    setPurchases((purchasesRes.data as PaintPurchase[]) ?? [])
    setExtraCosts((extraRes?.data ?? []) as { id: string; date: string; description: string; amount: number }[])
    setLoading(false)
  }, [dateFrom, dateTo])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredLogs = useMemo(() => logs.filter((l) => l.date >= dateFrom && l.date <= dateTo), [logs, dateFrom, dateTo])
  const filteredPurchases = useMemo(() => purchases.filter((p) => p.date >= dateFrom && p.date <= dateTo), [purchases, dateFrom, dateTo])

  const HOURLY_RATE = 45
  const revenue = useMemo(() => orders.reduce((s, o) => s + o.order_items.reduce((si, i) => si + Number(i.total_price), 0), 0), [orders])
  const totalM2 = useMemo(() => orders.reduce((s, o) => s + o.order_items.reduce((si, i) => si + Number(i.m2), 0), 0), [orders])
  const laborCost = useMemo(() => filteredLogs.reduce((s, l) => s + Number(l.hours) * HOURLY_RATE, 0), [filteredLogs])
  const totalHours = useMemo(() => filteredLogs.reduce((s, l) => s + Number(l.hours), 0), [filteredLogs])
  const materialCost = useMemo(() => filteredPurchases.reduce((s, p) => s + Number(p.total), 0), [filteredPurchases])
  const extraCostTotal = useMemo(() => extraCosts.reduce((s, c) => s + Number(c.amount), 0), [extraCosts])
  const totalCosts = laborCost + materialCost + extraCostTotal
  const profit = revenue - totalCosts
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

  const orderRanking = useMemo(() =>
    orders.map((o) => ({
      number: o.number, year: new Date(o.created_at).getFullYear() % 100,
      client: o.client?.name ?? '—',
      revenue: o.order_items.reduce((s, i) => s + Number(i.total_price), 0),
      m2: o.order_items.reduce((s, i) => s + Number(i.m2), 0),
    })).filter((o) => o.revenue > 0).sort((a, b) => b.revenue - a.revenue),
  [orders])

  const addExtraCost = async () => {
    if (!newExtraDesc || !newExtraAmount) return
    await supabase.from('extra_costs').insert({ date: dateFrom, description: newExtraDesc, amount: Math.round(Number(newExtraAmount) * 100) / 100 })
    setNewExtraDesc(''); setNewExtraAmount(''); toast('Koszt dodany'); fetchData()
  }

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" /></div>

  return (
    <div className="space-y-4 max-w-4xl mx-auto print:space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Raport finansowy</h1>
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
            {extraCostTotal > 0 && <div className="bg-rose-500" style={{ width: `${(extraCostTotal / revenue) * 100}%` }} />}
            {profit > 0 && <div className="bg-emerald-500" style={{ width: `${(profit / revenue) * 100}%` }} />}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Praca {((laborCost / revenue) * 100).toFixed(0)}%</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> Materiały {((materialCost / revenue) * 100).toFixed(0)}%</span>
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
      {filteredPurchases.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">Zakupy lakierów i materiałów</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-3 py-1.5 text-left font-medium text-gray-500">Data</th>
                <th className="px-3 py-1.5 text-left font-medium text-gray-500">Produkt</th>
                <th className="px-3 py-1.5 text-right font-medium text-gray-500">Ilość</th>
                <th className="px-3 py-1.5 text-right font-medium text-gray-500">Kwota</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map((p, i) => (
                <tr key={p.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                  <td className="px-3 py-1 text-gray-600">{p.date}</td>
                  <td className="px-3 py-1 text-gray-800">{p.product}{p.color ? ` (${p.color})` : ''}</td>
                  <td className="px-3 py-1 text-right text-gray-600">{p.quantity} {p.unit}</td>
                  <td className="px-3 py-1 text-right text-orange-600 tabular-nums">{fmtPL(Number(p.total))} zł</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                <td className="px-3 py-1.5 text-gray-700" colSpan={3}>Razem</td>
                <td className="px-3 py-1.5 text-right text-orange-600 tabular-nums">{fmtPL(materialCost)} zł</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Extra costs — editable */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">Dodatkowe koszty</div>
        <table className="w-full text-xs">
          <tbody>
            {extraCosts.map((c) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="px-3 py-1.5 text-gray-600 w-24">{c.date}</td>
                <td className="px-3 py-1.5 text-gray-800">{c.description}</td>
                <td className="px-3 py-1.5 text-right text-rose-600 tabular-nums w-28">{fmtPL(Number(c.amount))} zł</td>
                <td className="px-1 py-1.5 w-6 print:hidden">
                  <button onClick={async () => {
                    await supabase.from('extra_costs').delete().eq('id', c.id)
                    toast('Koszt usunięty'); fetchData()
                  }} className="rounded p-0.5 text-gray-300 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                </td>
              </tr>
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
