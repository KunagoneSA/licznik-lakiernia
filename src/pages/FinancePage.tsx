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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900">Podsumowanie finansowe</h1>
        <div className="flex gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
          <span className="self-center text-gray-400">—</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={DollarSign} label="Przychody" value={`${revenue.toFixed(0)} zł`} color="text-amber-600" />
        <StatCard icon={Paintbrush} label="Koszty pracy" value={`${laborCost.toFixed(0)} zł`} color="text-red-600" sub={`${totalHours.toFixed(1)}h`} />
        <StatCard icon={Package} label="Koszty materiałów" value={`${materialCost.toFixed(0)} zł`} color="text-orange-600" sub={`${filteredPurchases.length} zakupów`} />
        <StatCard
          icon={profit >= 0 ? TrendingUp : TrendingDown}
          label="Zysk netto"
          value={`${profit.toFixed(0)} zł`}
          color={profit >= 0 ? 'text-emerald-600' : 'text-red-600'}
          sub={`marża ${margin.toFixed(1)}%`}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-white shadow-sm p-4">
          <p className="text-xs text-gray-400 uppercase">Zamówień w okresie</p>
          <p className="mt-1 text-2xl font-bold text-gray-800">{filteredOrders.length}</p>
        </div>
        <div className="rounded-lg bg-white shadow-sm p-4">
          <p className="text-xs text-gray-400 uppercase">Łącznie m²</p>
          <p className="mt-1 text-2xl font-bold text-gray-800">{totalM2.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-white shadow-sm p-4">
          <p className="text-xs text-gray-400 uppercase">Zysk / m²</p>
          <p className={`mt-1 text-2xl font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {totalM2 > 0 ? (profit / totalM2).toFixed(2) : '—'} zł
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Per-worker breakdown */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-600 uppercase tracking-wide">Koszty pracy wg pracownika</h2>
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Pracownik</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Godziny</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Koszt</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Udział</th>
                </tr>
              </thead>
              <tbody>
                {workerStats.map(([name, s]) => (
                  <tr key={name} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-gray-800 font-medium">{name}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{s.hours.toFixed(1)}h</td>
                    <td className="px-4 py-2 text-right text-amber-600">{s.cost.toFixed(0)} zł</td>
                    <td className="px-4 py-2 text-right text-gray-500">
                      {laborCost > 0 ? ((s.cost / laborCost) * 100).toFixed(0) : 0}%
                    </td>
                  </tr>
                ))}
                {workerStats.length > 0 && (
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-4 py-2 text-gray-600">Razem</td>
                    <td className="px-4 py-2 text-right text-gray-600">{totalHours.toFixed(1)}h</td>
                    <td className="px-4 py-2 text-right text-amber-600">{laborCost.toFixed(0)} zł</td>
                    <td className="px-4 py-2 text-right text-gray-500">100%</td>
                  </tr>
                )}
                {workerStats.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Brak danych</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-order ranking */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-600 uppercase tracking-wide">Zamówienia wg przychodu</h2>
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">#</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Klient</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">m²</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Przychód</th>
                </tr>
              </thead>
              <tbody>
                {orderRanking.map((o) => (
                  <tr key={o.number} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-amber-600 font-medium">{o.number}</td>
                    <td className="px-4 py-2 text-gray-800">{o.client}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{o.m2.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-amber-600 font-medium">{o.revenue.toFixed(0)} zł</td>
                  </tr>
                ))}
                {orderRanking.length > 0 && (
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-4 py-2 text-gray-600" colSpan={2}>Razem</td>
                    <td className="px-4 py-2 text-right text-gray-600">{totalM2.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-amber-600">{revenue.toFixed(0)} zł</td>
                  </tr>
                )}
                {orderRanking.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Brak zamówień z elementami</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cost structure bar */}
      {revenue > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-600 uppercase tracking-wide">Struktura kosztów</h2>
          <div className="rounded-lg bg-white shadow-sm p-4">
            <div className="flex h-6 w-full overflow-hidden rounded-full bg-gray-200">
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
    <div className="rounded-lg bg-white shadow-sm p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${color}`} />
        <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
