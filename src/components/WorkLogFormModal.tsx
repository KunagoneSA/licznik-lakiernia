import { useState } from 'react'
import { X } from 'lucide-react'
import { useModalKeys } from '../hooks/useModalKeys'

const workerNames = ['Kasia', 'Lukasz', 'Michal', 'Fabian']
const operations = ['Przygotowanie', 'Podkład', 'Szlifowanie', 'Lakierowanie', 'Pakowanie', 'Sprzątanie', 'Inne']
const defaultRates: Record<string, number> = { Kasia: 35, Lukasz: 50, Michal: 50, Fabian: 20 }

interface Props {
  orderId: string | null
  onClose: () => void
  onSave: (log: { order_id: string | null; worker_name: string; operation: string; date: string; hours: number; hourly_rate: number; cost: number; m2_painted: number | null }) => void
}

export default function WorkLogFormModal({ orderId, onClose, onSave }: Props) {
  const [workerName, setWorkerName] = useState(workerNames[0])
  const [operation, setOperation] = useState(operations[0])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState(0)
  const [hourlyRate, setHourlyRate] = useState(defaultRates[workerNames[0]] ?? 35)
  const [m2Painted, setM2Painted] = useState<string>('')
  useModalKeys(onClose)

  const cost = hours * hourlyRate

  const handleWorkerChange = (name: string) => {
    setWorkerName(name)
    if (defaultRates[name]) setHourlyRate(defaultRates[name])
  }

  const handleSave = () => {
    if (!hours) return
    onSave({
      order_id: orderId,
      worker_name: workerName,
      operation,
      date,
      hours,
      hourly_rate: hourlyRate,
      cost: Math.round(cost * 100) / 100,
      m2_painted: m2Painted ? Number(m2Painted) : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white border border-gray-200 shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Dodaj etap pracy</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Pracownik</label>
              <select value={workerName} onChange={(e) => handleWorkerChange(e.target.value)}
                className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30">
                {workerNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Operacja</label>
              <select value={operation} onChange={(e) => setOperation(e.target.value)}
                className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30">
                {operations.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Godziny</label>
              <input type="number" step="0.5" value={hours || ''} onChange={(e) => setHours(Number(e.target.value))}
                className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Stawka (zł/h)</label>
              <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">m2 (opcj.)</label>
              <input type="number" step="0.01" value={m2Painted} onChange={(e) => setM2Painted(e.target.value)}
                className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <span className="text-gray-500">Koszt:</span>{' '}
            <span className="text-amber-600 font-bold">{cost.toFixed(2)} zł</span>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100">Anuluj</button>
          <button onClick={handleSave} disabled={!hours}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50">
            Dodaj
          </button>
        </div>
      </div>
    </div>
  )
}
