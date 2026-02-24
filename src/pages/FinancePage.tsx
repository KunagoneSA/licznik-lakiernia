import { useMemo, useState } from 'react'
import { useOrders } from '../hooks/useOrders'
import { useWorkLogs } from '../hooks/useWorkLogs'

export default function FinancePage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const { orders } = useOrders()
  const { logs } = useWorkLogs()

  const laborCost = useMemo(() =>
    logs.filter((l) => l.date >= dateFrom && l.date <= dateTo)
      .reduce((s, l) => s + Number(l.cost), 0),
    [logs, dateFrom, dateTo])

  const totalHours = useMemo(() =>
    logs.filter((l) => l.date >= dateFrom && l.date <= dateTo)
      .reduce((s, l) => s + Number(l.hours), 0),
    [logs, dateFrom, dateTo])

  const stats = [
    { label: 'Zamowien', value: orders.length.toString(), color: 'text-slate-200' },
    { label: 'Koszty pracy', value: `${laborCost.toFixed(0)} zl`, color: 'text-red-400' },
    { label: 'Godziny', value: totalHours.toFixed(1), color: 'text-slate-200' },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-100">Podsumowanie finansowe</h1>

      <div className="flex gap-3">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-amber-500/50" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-amber-500/50" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-slate-800 p-4">
            <p className="text-xs text-slate-500 uppercase">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-slate-500">Pelne podsumowanie z przychodami i materialami dostepne po dodaniu zamowien z elementami.</p>
    </div>
  )
}
