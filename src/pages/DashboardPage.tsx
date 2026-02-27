import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useOrders } from '../hooks/useOrders'
import KanbanColumn from '../components/KanbanColumn'
import DashboardStats from '../components/DashboardStats'

const columns = [
  { status: 'nowe', title: 'Nowe', color: 'bg-blue-400' },
  { status: 'w_trakcie', title: 'W trakcie', color: 'bg-amber-400' },
  { status: 'gotowe', title: 'Gotowe', color: 'bg-emerald-400' },
  { status: 'wydane', title: 'Do odbioru', color: 'bg-violet-400' },
] as const

export default function DashboardPage() {
  const { orders, loading, error } = useOrders()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" />
      </div>
    )
  }

  if (error) {
    return <p className="py-8 text-center text-red-600">{error}</p>
  }

  return (
    <div className="space-y-6">
      <DashboardStats orders={orders} />
      {orders.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <p className="text-lg font-medium text-gray-500">Brak zamówień</p>
          <p className="mt-1 text-sm text-gray-400">Dodaj pierwsze zamówienie, żeby zobaczyć tablicę</p>
          <Link to="/zamowienia" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400">
            <Plus className="h-4 w-4" /> Nowe zamówienie
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => (
            <KanbanColumn
              key={col.status}
              title={col.title}
              color={col.color}
              orders={orders.filter((o) => o.status === col.status)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
