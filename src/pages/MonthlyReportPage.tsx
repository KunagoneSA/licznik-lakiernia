import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { usePaintingVariants } from '../hooks/usePaintingVariants'
import type { WorkLog } from '../types/database'

interface OrderItem { total_price: number; m2: number; quantity: number; has_handle: boolean; has_wplyka: boolean; color_surcharge: boolean }
interface CompletedOrder {
  id: string; number: number; color: string | null; ready_date: string | null; created_at: string; status: string
  client: { name: string } | null; order_items: OrderItem[]
}

const MONTH_NAMES = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']

function fmtH(n: number) {
  return n ? String(n).replace('.', ',') : ''
}

export default function MonthlyReportPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-based
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [completedOrders, setCompletedOrders] = useState<CompletedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const { variants } = usePaintingVariants()

  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const toggleExpand = (w: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(w) ? next.delete(w) : next.add(w)
      return next
    })
  }

  const shiftMonth = (dir: number) => {
    let m = month + dir
    let y = year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setMonth(m)
    setYear(y)
    setExpanded(new Set())
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
    const [logsRes, ordersRes] = await Promise.all([
      supabase.from('work_logs').select('*').gte('date', from).lte('date', to).order('worker_name'),
      supabase.from('orders')
        .select('id, number, color, ready_date, created_at, status, client:clients(name), order_items(total_price, m2, quantity, has_handle, has_wplyka, color_surcharge)')
        .in('status', ['gotowe', 'wydane', 'fv_wystawiona', 'zapłacone'])
        .order('ready_date', { ascending: true }),
    ])
    setLogs((logsRes.data as WorkLog[]) ?? [])
    const allOrders = (ordersRes.data as unknown as CompletedOrder[]) ?? []
    setCompletedOrders(allOrders.filter(o => {
      if (o.ready_date) return o.ready_date >= from && o.ready_date <= to
      return false // skip orders without ready_date
    }))
    setLoading(false)
  }, [year, month, daysInMonth])

  useEffect(() => { fetchData() }, [fetchData])

  // Group: worker -> day -> total hours + worker -> operation -> day -> hours
  const { workers, grid, opGrid, dayTotals, workerTotals, workerOps, grandTotal } = useMemo(() => {
    const map = new Map<string, Map<number, number>>()
    const opMap = new Map<string, Map<string, Map<number, number>>>() // worker -> op -> day -> hours
    const workerOpsSet = new Map<string, Set<string>>()

    for (const l of logs) {
      const day = parseInt(l.date.slice(8, 10), 10)
      const w = l.worker_name
      const op = l.operation

      // Worker total grid
      if (!map.has(w)) map.set(w, new Map())
      const wMap = map.get(w)!
      wMap.set(day, (wMap.get(day) ?? 0) + Number(l.hours))

      // Operation grid per worker
      if (!opMap.has(w)) opMap.set(w, new Map())
      const wOpMap = opMap.get(w)!
      if (!wOpMap.has(op)) wOpMap.set(op, new Map())
      const opDayMap = wOpMap.get(op)!
      opDayMap.set(day, (opDayMap.get(day) ?? 0) + Number(l.hours))

      // Track operations per worker
      if (!workerOpsSet.has(w)) workerOpsSet.set(w, new Set())
      workerOpsSet.get(w)!.add(op)
    }

    const workers = [...map.keys()].sort()
    const dayTotals = new Map<number, number>()
    const workerTotals = new Map<string, number>()
    const workerOps = new Map<string, string[]>()
    let grandTotal = 0

    for (const [w, days] of map) {
      let wTotal = 0
      for (const [d, h] of days) {
        dayTotals.set(d, (dayTotals.get(d) ?? 0) + h)
        wTotal += h
      }
      workerTotals.set(w, wTotal)
      grandTotal += wTotal
      workerOps.set(w, [...(workerOpsSet.get(w) ?? [])].sort())
    }

    return { workers, grid: map, opGrid: opMap, dayTotals, workerTotals, workerOps, grandTotal }
  }, [logs])

  // Surcharge prices
  const handlePrice = useMemo(() => variants.find(v => v.name === 'Uchwyt frezowany')?.default_price_per_m2 ?? 0, [variants])
  const wplykaPrice = useMemo(() => variants.find(v => v.name.toLowerCase().includes('wpyłka') || v.name.toLowerCase().includes('wpłyka') || v.name.toLowerCase().includes('wypłka'))?.default_price_per_m2 ?? 0, [variants])
  const colorSurchargePrice = useMemo(() => variants.find(v => v.name === 'Dopłata do koloru')?.default_price_per_m2 ?? 0, [variants])

  function getOrderValue(items: OrderItem[]): number {
    const base = items.reduce((s, i) => s + Number(i.total_price), 0)
    const handles = items.filter(i => i.has_handle).reduce((s, i) => s + handlePrice * Number(i.quantity), 0)
    const wplyka = items.filter(i => i.has_wplyka).reduce((s, i) => s + wplykaPrice * Number(i.quantity), 0)
    const colorSurch = items.filter(i => i.color_surcharge).reduce((s, i) => s + colorSurchargePrice * Number(i.m2), 0)
    return base + handles + wplyka + colorSurch
  }

  const ordersTotalValue = useMemo(() => completedOrders.reduce((s, o) => s + getOrderValue(o.order_items), 0), [completedOrders, handlePrice, wplykaPrice, colorSurchargePrice])
  const ordersTotalM2 = useMemo(() => completedOrders.reduce((s, o) => s + o.order_items.reduce((s2, i) => s2 + Number(i.m2), 0), 0), [completedOrders])

  const isWeekend = (day: number) => {
    const d = new Date(year, month, day)
    return d.getDay() === 0 || d.getDay() === 6
  }

  const exportCsv = () => {
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const header = ['Pracownik', ...days.map(String), 'SUMA'].join(',')
    const rows: string[] = []
    for (const w of workers) {
      const wMap = grid.get(w)!
      const cells = days.map(d => wMap.get(d) ?? '')
      rows.push([w, ...cells, workerTotals.get(w) ?? 0].join(','))
      for (const op of workerOps.get(w) ?? []) {
        const opDayMap = opGrid.get(w)?.get(op)
        const opCells = days.map(d => opDayMap?.get(d) ?? '')
        const opTotal = days.reduce((s, d) => s + (opDayMap?.get(d) ?? 0), 0)
        rows.push([`  ${op}`, ...opCells, opTotal].join(','))
      }
    }
    const totalRow = ['SUMA', ...days.map(d => dayTotals.get(d) ?? ''), grandTotal].join(',')
    const csv = [header, ...rows, totalRow].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `raport-${year}-${String(month + 1).padStart(2, '0')}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Raport miesięczny</h1>
        <button onClick={exportCsv} className="flex items-center gap-2 rounded-lg bg-white shadow-sm border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>

      {/* Month picker */}
      <div className="flex items-center gap-2">
        <button onClick={() => shiftMonth(-1)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[160px] text-center text-sm font-semibold text-gray-800">
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={() => shiftMonth(1)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" />
        </div>
      ) : workers.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">Brak wpisów w tym miesiącu</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 min-w-[140px]">Pracownik</th>
                {days.map(d => (
                  <th key={d} className={`px-1.5 py-2 text-center font-medium min-w-[32px] ${isWeekend(d) ? 'bg-amber-50/60 text-amber-700' : 'text-gray-500'}`}>
                    {d}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-bold text-gray-800 bg-gray-50 min-w-[48px]">Σ</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(w => {
                const isOpen = expanded.has(w)
                const ops = workerOps.get(w) ?? []
                return (
                  <Fragment key={w}>
                    {/* Worker row */}
                    <tr className={`border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer ${workers.indexOf(w) % 2 === 1 ? 'bg-gray-50/40' : ''}`} onClick={() => toggleExpand(w)}>
                      <td className={`sticky left-0 z-10 px-3 py-1.5 font-medium text-gray-900 whitespace-nowrap ${workers.indexOf(w) % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                        <span className="flex items-center gap-1">
                          {isOpen ? <ChevronUp className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />}
                          {w}
                        </span>
                      </td>
                      {days.map(d => {
                        const h = grid.get(w)?.get(d)
                        return (
                          <td key={d} className={`px-1.5 py-1.5 text-center tabular-nums ${isWeekend(d) ? 'bg-amber-50/40' : ''} ${h ? 'text-gray-800' : 'text-gray-200'}`}>
                            {fmtH(h ?? 0)}
                          </td>
                        )
                      })}
                      <td className="px-3 py-1.5 text-center font-bold text-gray-900 bg-gray-50 tabular-nums">
                        {fmtH(workerTotals.get(w) ?? 0)}
                      </td>
                    </tr>
                    {/* Operation rows (expandable) */}
                    {isOpen && ops.map(op => {
                      const opDayMap = opGrid.get(w)?.get(op)
                      const opTotal = days.reduce((s, d) => s + (opDayMap?.get(d) ?? 0), 0)
                      return (
                        <tr key={`${w}-${op}`} className="border-b border-gray-50 bg-gray-50/30">
                          <td className="sticky left-0 z-10 bg-gray-50/30 pl-8 pr-3 py-1 text-gray-500 whitespace-nowrap italic text-[10px]">
                            {op}
                          </td>
                          {days.map(d => {
                            const h = opDayMap?.get(d)
                            return (
                              <td key={d} className={`px-1.5 py-1 text-center tabular-nums text-[10px] ${isWeekend(d) ? 'bg-amber-50/20' : ''} ${h ? 'text-gray-500' : ''}`}>
                                {fmtH(h ?? 0)}
                              </td>
                            )
                          })}
                          <td className="px-3 py-1 text-center font-medium text-gray-500 bg-gray-50/50 tabular-nums text-[10px]">
                            {fmtH(opTotal)}
                          </td>
                        </tr>
                      )
                    })}
                  </Fragment>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td className="sticky left-0 z-10 bg-gray-50 px-3 py-2 font-bold text-gray-700">SUMA</td>
                {days.map(d => {
                  const h = dayTotals.get(d)
                  return (
                    <td key={d} className={`px-1.5 py-2 text-center font-semibold tabular-nums ${isWeekend(d) ? 'bg-amber-50/60' : ''} ${h ? 'text-gray-800' : 'text-gray-300'}`}>
                      {fmtH(h ?? 0)}
                    </td>
                  )
                })}
                <td className="px-3 py-2 text-center font-bold text-amber-700 tabular-nums">
                  {fmtH(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Completed orders section */}
      {!loading && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Zamówienia zakończone</h2>
          {completedOrders.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">Brak zakończonych zamówień w tym miesiącu</p>
          ) : (
            <>
              <div className="flex gap-4 text-sm">
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm">
                  <span className="text-gray-500">Zamówienia:</span>{' '}
                  <span className="font-bold text-gray-900">{completedOrders.length}</span>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm">
                  <span className="text-gray-500">Łącznie m²:</span>{' '}
                  <span className="font-bold text-gray-900">{String(Math.round(ordersTotalM2 * 100) / 100).replace('.', ',')}</span>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm">
                  <span className="text-gray-500">Wartość netto:</span>{' '}
                  <span className="font-bold text-gray-900">{ordersTotalValue.toFixed(2).replace('.', ',')} zł</span>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                      <th className="px-3 py-2 text-left font-medium">Nr</th>
                      <th className="px-3 py-2 text-left font-medium">Klient</th>
                      <th className="px-3 py-2 text-left font-medium">Kolor</th>
                      <th className="px-3 py-2 text-right font-medium">m²</th>
                      <th className="px-3 py-2 text-right font-medium">Wartość netto</th>
                      <th className="px-3 py-2 text-center font-medium">Data gotowości</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedOrders.map((o, idx) => {
                      const yr = new Date(o.created_at).getFullYear() % 100
                      const m2 = o.order_items.reduce((s, i) => s + Number(i.m2), 0)
                      const val = getOrderValue(o.order_items)
                      return (
                        <tr key={o.id} className={`border-b border-gray-100 ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                          <td className="px-3 py-2 font-medium text-gray-900">{o.number}/{yr}</td>
                          <td className="px-3 py-2 text-gray-700">{o.client?.name ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-600">{o.color ?? '—'}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-gray-800">{String(Math.round(m2 * 100) / 100).replace('.', ',')}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-900">{val.toFixed(2).replace('.', ',')} zł</td>
                          <td className="px-3 py-2 text-center text-gray-600">{o.ready_date ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                      <td colSpan={3} className="px-3 py-2 text-gray-700">SUMA</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-900">{String(Math.round(ordersTotalM2 * 100) / 100).replace('.', ',')}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-700">{ordersTotalValue.toFixed(2).replace('.', ',')} zł</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
