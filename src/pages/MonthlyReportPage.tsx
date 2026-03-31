import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { WorkLog } from '../types/database'

const MONTH_NAMES = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']

function fmtH(n: number) {
  return n ? String(n).replace('.', ',') : ''
}

export default function MonthlyReportPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-based
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

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

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
    const { data } = await supabase
      .from('work_logs')
      .select('*')
      .gte('date', from)
      .lte('date', to)
      .order('worker_name')
    setLogs((data as WorkLog[]) ?? [])
    setLoading(false)
  }, [year, month, daysInMonth])

  useEffect(() => { fetchLogs() }, [fetchLogs])

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
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer" onClick={() => toggleExpand(w)}>
                      <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-gray-900 whitespace-nowrap">
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
    </div>
  )
}
