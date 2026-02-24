import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useWorkLogs } from '../hooks/useWorkLogs'

const workerNames = ['Kasia', 'Lukasz', 'Michal', 'Fabian']

export default function WorkerReportPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [worker, setWorker] = useState('')
  const { logs, loading } = useWorkLogs()

  const filtered = useMemo(() =>
    logs.filter((l) => {
      if (l.date < dateFrom || l.date > dateTo) return false
      if (worker && l.worker_name !== worker) return false
      return true
    }), [logs, dateFrom, dateTo, worker])

  const summary = useMemo(() => {
    const map = new Map<string, { hours: number; cost: number; m2: number }>()
    filtered.forEach((l) => {
      const cur = map.get(l.worker_name) ?? { hours: 0, cost: 0, m2: 0 }
      cur.hours += Number(l.hours)
      cur.cost += Number(l.cost)
      cur.m2 += Number(l.m2_painted ?? 0)
      map.set(l.worker_name, cur)
    })
    return map
  }, [filtered])

  const exportCsv = () => {
    const header = 'Data,Pracownik,Operacja,Godziny,Stawka,Koszt,m2\n'
    const rows = filtered.map((l) =>
      `${l.date},${l.worker_name},${l.operation},${l.hours},${l.hourly_rate},${l.cost},${l.m2_painted ?? ''}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `raport-${dateFrom}-${dateTo}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Raport pracowników</h1>
        <button onClick={exportCsv} className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700">
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-amber-500/50" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-amber-500/50" />
        <select value={worker} onChange={(e) => setWorker(e.target.value)}
          className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-amber-500/50">
          <option value="">Wszyscy</option>
          {workerNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Summary per worker */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from(summary.entries()).map(([name, s]) => (
          <div key={name} className="rounded-lg bg-zinc-800 p-3">
            <p className="text-sm font-medium text-zinc-200">{name}</p>
            <p className="text-xs text-zinc-400">{s.hours.toFixed(1)}h &middot; {s.cost.toFixed(0)} zl{s.m2 > 0 ? ` · ${s.m2.toFixed(2)} m2` : ''}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/50">
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Data</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Pracownik</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Operacja</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">Godziny</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">Stawka</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">Koszt</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-zinc-800/50">
                  <td className="px-4 py-2 text-zinc-400">{new Date(l.date).toLocaleDateString('pl-PL')}</td>
                  <td className="px-4 py-2 text-zinc-200">{l.worker_name}</td>
                  <td className="px-4 py-2 text-zinc-300">{l.operation}</td>
                  <td className="px-4 py-2 text-right text-zinc-300">{l.hours}</td>
                  <td className="px-4 py-2 text-right text-zinc-400">{l.hourly_rate} zl</td>
                  <td className="px-4 py-2 text-right font-medium text-amber-400">{Number(l.cost).toFixed(2)} zl</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">Brak wpisów</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
