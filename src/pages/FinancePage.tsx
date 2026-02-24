import { useCallback, useEffect, useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Paintbrush, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useWorkLogs } from '../hooks/useWorkLogs'
import type { PaintPurchase } from '../types/database'

interface OrderWithItems {
  id: string
  number: number
  status: string
  created_at: string
  client: { name: string } | null
  order_items: { total_price: number; m2: number }[]
}

export default function FinancePage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const { logs } = useWorkLogs()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [purchases, setPurchases] = useState<PaintPurchase[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [ordersRes, purchasesRes] = await Promise.all([
      supabase.from('orders').select('id, number, status, created_at, client:clients(name), order_items(total_price, m2)'),
      supabase.from('paint_purchases').select('*').order('date', { ascending: false }),
    ])
    setOrders((ordersRes.data as unknown as OrderWithItems[]) ?? [])
    setPurchases((purchasesRes.data as PaintPurchase[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Filter logs and purchases by date range
  const filteredLogs = useMemo(() =>
    logs.filter((l) => l.date >= dateFrom && l.date <= dateTo),
    [logs, dateFrom, dateTo])

  const filteredPurchases = useMemo(() =>
    purchases.filter((p) => p.date >= dateFrom && p.date <= dateTo),
    [purchases, dateFrom, dateTo])

  // Filter orders by created_at date range
  const filteredOrders = useMemo(() =>
    orders.filter((o) => {
      const d = o.created_at.slice(0, 10)
      return d >= dateFrom && d <= dateTo
    }),
    [orders, dateFrom, dateTo])

  // Calculate totals
  const revenue = useMemo(() =>
    filteredOrders.reduce((s, o) =>
      s + o.order_items.reduce((si, i) => si + Number(i.total_price), 0), 0),
    [filteredOrders])

  const totalM2 = useMemo(() =>
    filteredOrders.reduce((s, o) =>
      s + o.order_items.reduce((si, i) => si + Number(i.m2), 0), 0),
    [filteredOrders])

  const laborCost = useMemo(() =>
    filteredLogs.reduce((s, l) => s + Number(l.cost), 0),
    [filteredLogs])

  const totalHours = useMemo(() =>
    filteredLogs.reduce((s, l) => s + Number(l.hours), 0),
    [filteredLogs])

  const materialCost = useMemo(() =>
    filteredPurchases.reduce((s, p) => s + Number(p.total), 0),
    [filteredPurchases])

  const profit = revenue - laborCost - materialCost
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0

  // Per-worker breakdown
  const workerStats = useMemo(() => {
    const map = new Map<string, { hours: number; cost: number }>()
    filteredLogs.forEach((l) => {
      const cur = map.get(l.worker_name) ?? { hours: 0, cost: 0 }
      cur.hours += Number(l.hours)
      cur.cost += Number(l.cost)
      map.set(l.worker_name, cur)
    })
    return Array.from(map.entries()).sort((a, b) => b[1].cost - a[1].cost)
  }, [filteredLogs])

  // Per-order revenue ranking
  const orderRanking = useMemo(() =>
    filteredOrders
      .map((o) => ({
        number: o.number,
        client: o.client?.name ?? '—',
        revenue: o.order_items.reduce((s, i) => s + Number(i.total_price), 0),
        m2: o.order_items.reduce((s, i) => s + Number(i.m2), 0),
      }))
      .filter((o) => o.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue),
    [filteredOrders])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Podsumowanie finansowe</h1>
        <div className="flex gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-amber-500/50" />
          <span className="self-center text-zinc-500">—</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-amber-500/50" />
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={DollarSign} label="Przychody" value={`${revenue.toFixed(0)} zł`} color="text-amber-400" />
        <StatCard icon={Paintbrush} label="Koszty pracy" value={`${laborCost.toFixed(0)} zł`} color="text-red-400" sub={`${totalHours.toFixed(1)}h`} />
        <StatCard icon={Package} label="Koszty materiałów" value={`${materialCost.toFixed(0)} zł`} color="text-orange-400" sub={`${filteredPurchases.length} zakupów`} />
        <StatCard
          icon={profit >= 0 ? TrendingUp : TrendingDown}
          label="Zysk netto"
          value={`${profit.toFixed(0)} zł`}
          color={profit >= 0 ? 'text-emerald-400' : 'text-red-400'}
          sub={`marża ${margin.toFixed(1)}%`}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-zinc-800 p-4">
          <p className="text-xs text-zinc-500 uppercase">Zamówień w okresie</p>
          <p className="mt-1 text-2xl font-bold text-zinc-200">{filteredOrders.length}</p>
        </div>
        <div className="rounded-lg bg-zinc-800 p-4">
          <p className="text-xs text-zinc-500 uppercase">Łącznie m²</p>
          <p className="mt-1 text-2xl font-bold text-zinc-200">{totalM2.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-zinc-800 p-4">
          <p className="text-xs text-zinc-500 uppercase">Zysk / m²</p>
          <p className={`mt-1 text-2xl font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalM2 > 0 ? (profit / totalM2).toFixed(2) : '—'} zł
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Per-worker breakdown */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300 uppercase tracking-wide">Koszty pracy wg pracownika</h2>
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Pracownik</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">Godziny</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">Koszt</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">Udział</th>
                </tr>
              </thead>
              <tbody>
                {workerStats.map(([name, s]) => (
                  <tr key={name} className="border-b border-zinc-800/50">
                    <td className="px-4 py-2 text-zinc-200 font-medium">{name}</td>
                    <td className="px-4 py-2 text-right text-zinc-300">{s.hours.toFixed(1)}h</td>
                    <td className="px-4 py-2 text-right text-amber-400">{s.cost.toFixed(0)} zł</td>
                    <td className="px-4 py-2 text-right text-zinc-400">
                      {laborCost > 0 ? ((s.cost / laborCost) * 100).toFixed(0) : 0}%
                    </td>
                  </tr>
                ))}
                {workerStats.length > 0 && (
                  <tr className="bg-zinc-800/30 font-medium">
                    <td className="px-4 py-2 text-zinc-300">Razem</td>
                    <td className="px-4 py-2 text-right text-zinc-300">{totalHours.toFixed(1)}h</td>
                    <td className="px-4 py-2 text-right text-amber-400">{laborCost.toFixed(0)} zł</td>
                    <td className="px-4 py-2 text-right text-zinc-400">100%</td>
                  </tr>
                )}
                {workerStats.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-zinc-500">Brak danych</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-order ranking */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300 uppercase tracking-wide">Zamówienia wg przychodu</h2>
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">#</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Klient</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">m²</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">Przychód</th>
                </tr>
              </thead>
              <tbody>
                {orderRanking.map((o) => (
                  <tr key={o.number} className="border-b border-zinc-800/50">
                    <td className="px-4 py-2 text-amber-400 font-medium">{o.number}</td>
                    <td className="px-4 py-2 text-zinc-200">{o.client}</td>
                    <td className="px-4 py-2 text-right text-zinc-300">{o.m2.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-amber-400 font-medium">{o.revenue.toFixed(0)} zł</td>
                  </tr>
                ))}
                {orderRanking.length > 0 && (
                  <tr className="bg-zinc-800/30 font-medium">
                    <td className="px-4 py-2 text-zinc-300" colSpan={2}>Razem</td>
                    <td className="px-4 py-2 text-right text-zinc-300">{totalM2.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-amber-400">{revenue.toFixed(0)} zł</td>
                  </tr>
                )}
                {orderRanking.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-zinc-500">Brak zamówień z elementami</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cost structure bar */}
      {revenue > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300 uppercase tracking-wide">Struktura kosztów</h2>
          <div className="rounded-lg bg-zinc-800 p-4">
            <div className="flex h-6 w-full overflow-hidden rounded-full bg-zinc-700">
              {laborCost > 0 && (
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${(laborCost / revenue) * 100}%` }}
                  title={`Praca: ${laborCost.toFixed(0)} zł`}
                />
              )}
              {materialCost > 0 && (
                <div
                  className="bg-orange-500 transition-all"
                  style={{ width: `${(materialCost / revenue) * 100}%` }}
                  title={`Materiały: ${materialCost.toFixed(0)} zł`}
                />
              )}
              {profit > 0 && (
                <div
                  className="bg-emerald-500 transition-all"
                  style={{ width: `${(profit / revenue) * 100}%` }}
                  title={`Zysk: ${profit.toFixed(0)} zł`}
                />
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Praca {laborCost > 0 ? `${((laborCost / revenue) * 100).toFixed(0)}%` : '—'}</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Materiały {materialCost > 0 ? `${((materialCost / revenue) * 100).toFixed(0)}%` : '—'}</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Zysk {profit > 0 ? `${((profit / revenue) * 100).toFixed(0)}%` : '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  color: string
  sub?: string
}) {
  return (
    <div className="rounded-lg bg-zinc-800 p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${color}`} />
        <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  )
}
