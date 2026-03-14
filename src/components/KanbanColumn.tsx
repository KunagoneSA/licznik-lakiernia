import type { Order } from '../types/database'
import OrderCard from './OrderCard'

interface Props {
  title: string
  orders: Order[]
  color: string
  wide?: boolean
}

export default function KanbanColumn({ title, orders, color, wide }: Props) {
  return (
    <div className={`flex flex-col ${wide ? 'xl:col-span-2' : ''}`}>
      <div className="mb-3 flex items-center justify-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</h2>
        <span className="text-xs text-gray-400">{orders.length}</span>
      </div>
      <div className={`flex-1 rounded-lg bg-gray-100 p-2 min-h-[200px] ${wide ? 'grid grid-cols-2 gap-2 auto-rows-min' : 'space-y-2'}`}>
        {orders.length === 0 && (
          <p className="py-8 text-center text-xs text-gray-300 col-span-2">Brak zamówień</p>
        )}
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}
