import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { WorkLog } from '../types/database'

interface OrderInfo {
  number: number
  created_at: string
  color: string | null
  client: { name: string } | null
}

interface WorkLogWithOrder extends WorkLog {
  order?: OrderInfo | null
}

const MONTH_NAMES = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']

export default function WorkerReportPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [logs, setLogs] = useState<WorkLogWithOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [monthLogs, setMonthLogs] = useState<WorkLog[]>([])
  const [mYear, setMYear] = useState(new Date().getFullYear())
  const [mMonth, setMMonth] = useState(new Date().getMonth())

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('work_logs')
      .select('*, order:orders(number, created_at, color, client:clients(name))')
      .eq('date', date)
      .order('worker_name')
      .order('created_at')
    setLogs((data as WorkLogWithOrder[]) ?? [])
    setLoading(false)
  }, [date])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Monthly summary
  const mDays = new Date(mYear, mMonth + 1, 0).getDate()
  const mFrom = `${mYear}-${String(mMonth + 1).padStart(2, '0')}-01`
  const mTo = `${mYear}-${String(mMonth + 1).padStart(2, '0')}-${String(mDays).padStart(2, '0')}`
  const shiftMonth = (dir: number) => {
    let m = mMonth + dir, y = mYear
    if (m < 0) { m = 11; y-- } if (m > 11) { m = 0; y++ }
    setMMonth(m); setMYear(y)
  }
  const fetchMonthLogs = useCallback(async () => {
    const { data } = await supabase.from('work_logs').select('*').gte('date', mFrom).lte('date', mTo)
    setMonthLogs((data as WorkLog[]) ?? [])
  }, [mFrom, mTo])
  useEffect(() => { fetchMonthLogs() }, [fetchMonthLogs])

  const [notesFilter, setNotesFilter] = useState('')

  // Unique tags from notes
  const notesTags = useMemo(() => {
    const tags = new Set<string>()
    for (const l of monthLogs) {
      if (l.notes?.trim()) {
        const normalized = l.notes.trim().toLowerCase().replace(/[,.]$/,'')
        tags.add(normalized)
      }
    }
    return [...tags].sort()
  }, [monthLogs])

  // Filtered month logs
  const filteredMonthLogs = useMemo(() => {
    if (!notesFilter) return monthLogs
    return monthLogs.filter(l => l.notes?.toLowerCase().includes(notesFilter))
  }, [monthLogs, notesFilter])

  // Group: worker -> operation -> hours
  const monthSummary = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    const allOps = new Set<string>()
    const workerDays = new Map<string, Set<string>>()
    for (const l of filteredMonthLogs) {
      if (!map.has(l.worker_name)) map.set(l.worker_name, new Map())
      if (!workerDays.has(l.worker_name)) workerDays.set(l.worker_name, new Set())
      const opMap = map.get(l.worker_name)!
      opMap.set(l.operation, (opMap.get(l.operation) ?? 0) + Number(l.hours))
      allOps.add(l.operation)
      workerDays.get(l.worker_name)!.add(l.date)
    }
    const workers = [...map.keys()].sort()
    const operations = [...allOps].sort()
    const workerTotals = new Map<string, number>()
    const workerDayCounts = new Map<string, number>()
    workers.forEach(w => {
      const opMap = map.get(w)!
      workerTotals.set(w, [...opMap.values()].reduce((s, h) => s + h, 0))
      workerDayCounts.set(w, workerDays.get(w)?.size ?? 0)
    })
    const opTotals = new Map<string, number>()
    operations.forEach(op => {
      let t = 0
      workers.forEach(w => { t += map.get(w)?.get(op) ?? 0 })
      opTotals.set(op, t)
    })
    const grandTotal = [...workerTotals.values()].reduce((s, h) => s + h, 0)
    return { workers, operations, map, workerTotals, workerDayCounts, opTotals, grandTotal }
  }, [filteredMonthLogs])

  // Navigate date
  const shiftDate = (days: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().slice(0, 10))
  }

  // Format date for display
  const formatDate = (d: string) => {
    const dt = new Date(d + 'T12:00:00')
    const dayNames = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota']
    return `${dayNames[dt.getDay()]}, ${dt.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}`
  }

  const formatOrder = (o: OrderInfo | null | undefined) => {
    if (!o) return '—'
    const year = new Date(o.created_at).getFullYear() % 100
    const num = `${o.number}/${year}`
    const client = o.client?.name ?? ''
    const color = o.color ?? ''
    const details = [client, color].filter(Boolean).join(' · ')
    return details ? `${num} — ${details}` : num
  }

  // Group by worker
  const grouped = useMemo(() => {
    const map = new Map<string, { logs: WorkLogWithOrder[]; hours: number; cost: number; m2: number }>()
    logs.forEach((l) => {
      const cur = map.get(l.worker_name) ?? { logs: [], hours: 0, cost: 0, m2: 0 }
      cur.logs.push(l)
      cur.hours += Number(l.hours)
      cur.cost += Number(l.cost)
      cur.m2 += Number(l.m2_painted ?? 0)
      map.set(l.worker_name, cur)
    })
    return map
  }, [logs])

  const totals = useMemo(() => ({
    hours: logs.reduce((s, l) => s + Number(l.hours), 0),
    cost: logs.reduce((s, l) => s + Number(l.cost), 0),
  }), [logs])

  const exportCsv = () => {
    const header = 'Data,Pracownik,Operacja,Zamówienie,Godziny,Stawka,Koszt,m2\n'
    const rows = logs.map((l) =>
      `${l.date},${l.worker_name},${l.operation},"${formatOrder(l.order)}",${l.hours},${l.hourly_rate},${l.cost},${l.m2_painted ?? ''}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `raport-${date}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Raport pracowników</h1>
        <button onClick={exportCsv} className="flex items-center gap-2 rounded-lg bg-white shadow-sm border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-2">
        <button onClick={() => shiftDate(-1)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
          <span className="text-sm text-gray-500">({date === today ? 'dziś' : formatDate(date)})</span>
        </div>
        <button onClick={() => shiftDate(1)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <ChevronRight className="h-4 w-4" />
        </button>
        {date !== today && (
          <button onClick={() => setDate(today)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50">
            Dziś
          </button>
        )}
      </div>

      {/* Summary cards */}
      {grouped.size > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from(grouped.entries()).map(([name, s]) => (
            <div key={name} className="rounded-lg bg-white shadow-sm border border-gray-200 p-3">
              <p className="text-sm font-medium text-gray-800">{name}</p>
              <p className="text-lg font-semibold text-amber-600">{s.hours.toFixed(1)}h</p>
              <p className="text-xs text-gray-500">{s.m2 > 0 ? `${s.m2.toFixed(1)} m²` : ''}</p>
            </div>
          ))}
          {grouped.size > 1 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm font-medium text-gray-600">Razem</p>
              <p className="text-lg font-semibold text-amber-700">{totals.hours.toFixed(1)}h</p>
              <p className="text-xs text-gray-500">&nbsp;</p>
            </div>
          )}
        </div>
      )}

      {/* Detail table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-28">Pracownik</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-28">Operacja</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Zamówienie</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 w-20">Godziny</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 w-16">m²</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(grouped.entries()).map(([name, g]) => (
                <>
                  {g.logs.map((l, i) => (
                    <tr key={l.id} className={`border-b border-gray-100 ${i === 0 && grouped.size > 1 ? 'border-t-2 border-t-gray-200' : ''}`}>
                      {i === 0 ? (
                        <td className="px-4 py-2 font-medium text-gray-800" rowSpan={g.logs.length}>{name}</td>
                      ) : null}
                      <td className="px-4 py-2 text-gray-600">{l.operation}</td>
                      <td className="px-4 py-2 text-gray-500">{formatOrder(l.order)}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{l.hours}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{l.m2_painted ? Number(l.m2_painted).toFixed(1) : '—'}</td>
                    </tr>
                  ))}
                </>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Brak wpisów na ten dzień</td></tr>
              )}
              {logs.length > 0 && (
                <tr className="bg-gray-50 font-medium">
                  <td className="px-4 py-2 text-gray-600" colSpan={3}>Razem</td>
                  <td className="px-4 py-2 text-right text-gray-600">{totals.hours.toFixed(1)}</td>
                  <td className="px-4 py-2 text-right text-gray-500">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Monthly worker × operation summary */}
      <div className="mt-8 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Podsumowanie miesięczne</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => shiftMonth(-1)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[160px] text-center text-sm font-semibold text-gray-800">
            {MONTH_NAMES[mMonth]} {mYear}
          </span>
          <button onClick={() => shiftMonth(1)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => setNotesFilter(notesFilter === 'aluminium' ? '' : 'aluminium')}
            className={`ml-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${notesFilter === 'aluminium' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Aluminium
          </button>
          {notesTags.length > 0 && (
            <select value={notesFilter} onChange={(e) => setNotesFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-amber-500">
              <option value="">Wszystkie wpisy</option>
              {notesTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
        {monthSummary.workers.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">Brak wpisów w tym miesiącu</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-100">
                  <th className="px-3 py-1.5 text-left font-semibold text-gray-700">Pracownik</th>
                  {monthSummary.operations.map(op => (
                    <th key={op} className="px-2 py-1.5 text-right font-medium text-gray-600">{op}</th>
                  ))}
                  <th className="px-3 py-1.5 text-right font-bold text-gray-800 bg-gray-200">Σ</th>
                  <th className="px-2 py-1.5 text-center font-medium text-gray-600">Dni</th>
                </tr>
              </thead>
              <tbody>
                {monthSummary.workers.map((w, idx) => (
                  <tr key={w} className={`border-b border-gray-100 ${idx % 2 === 1 ? 'bg-gray-50' : ''}`}>
                    <td className="px-3 py-1 font-medium text-gray-900">{w}</td>
                    {monthSummary.operations.map(op => {
                      const h = monthSummary.map.get(w)?.get(op) ?? 0
                      return <td key={op} className={`px-2 py-1 text-right tabular-nums ${h ? 'text-gray-800' : 'text-gray-200'}`}>{h ? String(h).replace('.', ',') : ''}</td>
                    })}
                    <td className="px-3 py-1 text-right font-bold text-gray-900 bg-gray-50 tabular-nums">
                      {String(monthSummary.workerTotals.get(w) ?? 0).replace('.', ',')}
                    </td>
                    <td className="px-2 py-1 text-center text-gray-600 tabular-nums">{monthSummary.workerDayCounts.get(w) ?? 0}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-400 bg-gray-100 font-bold">
                  <td className="px-3 py-1.5 text-gray-700">SUMA</td>
                  {monthSummary.operations.map(op => (
                    <td key={op} className="px-2 py-1.5 text-right tabular-nums text-gray-800">
                      {String(monthSummary.opTotals.get(op) ?? 0).replace('.', ',')}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-right tabular-nums text-amber-700 bg-gray-200">
                    {String(monthSummary.grandTotal).replace('.', ',')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
