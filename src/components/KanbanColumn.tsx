import type { Order } from '../types/database'
import OrderCard from './OrderCard'

interface Props {
  title: string
  orders: Order[]
  color: string
}

export default function KanbanColumn({ title, orders, color }: Props) {
  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</h2>
        <span className="ml-auto text-xs text-gray-400">{orders.length}</span>
      </div>
      <div className="flex-1 space-y-2 rounded-lg bg-gray-100 p-2 min-h-[200px]">
        {orders.length === 0 && (
          <p className="py-8 text-center text-xs text-gray-300">Brak zamówień</p>
        )}
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}
