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

export default function WorkerReportPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [logs, setLogs] = useState<WorkLogWithOrder[]>([])
  const [loading, setLoading] = useState(true)

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
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Pracownik</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Operacja</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Zamówienie</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Godziny</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">m²</th>
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
    </div>
  )
}
