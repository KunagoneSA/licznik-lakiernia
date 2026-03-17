import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Check, X, ChevronLeft, ChevronRight, Copy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useWorkers } from '../hooks/useWorkers'
import { useOperations } from '../hooks/useOperations'
import { useToast } from '../contexts/ToastContext'
import type { WorkLog } from '../types/database'

const fmtPL = (n: number, decimals = 2) => {
  const [int, dec] = n.toFixed(decimals).split('.')
  const intFormatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return dec ? intFormatted + ',' + dec : intFormatted
}

const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']

function getWeekDates(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    dates.push(dd.toISOString().slice(0, 10))
  }
  return dates
}

export default function DailyWorkLogPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const { workers } = useWorkers()
  const { operations: ops } = useOperations()
  const { toast } = useToast()
  const operations = ops.length > 0 ? ops.map(o => o.name) : ['Przygotowanie', 'Podkład', 'Szlifowanie', 'Lakierowanie', 'Pakowanie', 'Sprzątanie', 'Inne']
  const activeWorkers = workers.filter(w => w.active)

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [newWorker, setNewWorker] = useState('')
  const [newOp, setNewOp] = useState('')
  const [newHours, setNewHours] = useState('')
  const [newRate, setNewRate] = useState('')
  const [newM2, setNewM2] = useState('')
  const [newNotes, setNewNotes] = useState('')

  // Edit
  const [editId, setEditId] = useState<string | null>(null)
  const [editWorker, setEditWorker] = useState('')
  const [editOp, setEditOp] = useState('')
  const [editHours, setEditHours] = useState('')
  const [editRate, setEditRate] = useState('')
  const [editM2, setEditM2] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Week dates
  const weekDates = getWeekDates(selectedDate)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('work_logs')
      .select('*')
      .eq('date', selectedDate)
      .order('created_at', { ascending: true })
    setLogs((data as WorkLog[]) ?? [])
    setLoading(false)
  }, [selectedDate])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Set defaults when workers load
  useEffect(() => {
    if (activeWorkers.length > 0 && !newWorker) {
      setNewWorker(activeWorkers[0].name)
      setNewRate(String(activeWorkers[0].hourly_rate))
    }
  }, [activeWorkers.length])

  const handleWorkerChange = (name: string) => {
    setNewWorker(name)
    const w = workers.find(w => w.name === name)
    if (w) setNewRate(String(w.hourly_rate))
  }

  const handleEditWorkerChange = (name: string) => {
    setEditWorker(name)
    const w = workers.find(w => w.name === name)
    if (w) setEditRate(String(w.hourly_rate))
  }

  const resetAdd = () => {
    setNewHours('')
    setNewM2('')
    setNewNotes('')
    if (operations.length > 0) setNewOp(operations[0])
  }

  const handleAdd = async () => {
    const h = Number(newHours)
    if (!h || !newWorker) return
    const rate = Number(newRate) || 35
    const { error } = await supabase.from('work_logs').insert({
      order_id: null,
      worker_name: newWorker,
      operation: newOp || operations[0],
      date: selectedDate,
      hours: h,
      hourly_rate: rate,
      cost: Math.round(h * rate * 100) / 100,
      m2_painted: newM2 ? Number(newM2) : null,
      notes: newNotes || null,
    })
    if (!error) {
      await fetchLogs()
      resetAdd()
      toast('Wpis dodany')
    } else {
      toast('Błąd dodawania', 'error')
    }
  }

  const startEdit = (log: WorkLog) => {
    setEditId(log.id)
    setEditWorker(log.worker_name)
    setEditOp(log.operation)
    setEditHours(String(log.hours))
    setEditRate(String(log.hourly_rate))
    setEditM2(log.m2_painted != null ? String(log.m2_painted) : '')
    setEditNotes(log.notes ?? '')
  }

  const saveEdit = async () => {
    if (!editId) return
    const h = Number(editHours)
    if (!h) return
    const rate = Number(editRate) || 35
    const { error } = await supabase.from('work_logs').update({
      worker_name: editWorker,
      operation: editOp,
      hours: h,
      hourly_rate: rate,
      cost: Math.round(h * rate * 100) / 100,
      m2_painted: editM2 ? Number(editM2) : null,
      notes: editNotes || null,
    }).eq('id', editId)
    if (!error) {
      setEditId(null)
      await fetchLogs()
      toast('Wpis zaktualizowany')
    }
  }

  const handleDelete = async (id: string) => {
    const deleted = logs.find(l => l.id === id)
    const { error } = await supabase.from('work_logs').delete().eq('id', id)
    if (!error) {
      await fetchLogs()
      toast('Wpis usunięty', 'success', {
        label: 'Cofnij', onClick: async () => {
          if (!deleted) return
          const { id: _id, created_at: _ca, ...rest } = deleted
          await supabase.from('work_logs').insert(rest)
          await fetchLogs()
          toast('Wpis przywrócony')
        }
      })
    }
  }

  const copyPreviousDay = async () => {
    const prevDate = new Date(selectedDate)
    prevDate.setDate(prevDate.getDate() - 1)
    const prevDateStr = prevDate.toISOString().slice(0, 10)
    const { data } = await supabase
      .from('work_logs')
      .select('*')
      .eq('date', prevDateStr)
      .is('order_id', null)
    if (!data || data.length === 0) {
      toast('Brak wpisów z poprzedniego dnia', 'error')
      return
    }
    const inserts = data.map((log: WorkLog) => ({
      order_id: null,
      worker_name: log.worker_name,
      operation: log.operation,
      date: selectedDate,
      hours: log.hours,
      hourly_rate: log.hourly_rate,
      cost: log.cost,
      m2_painted: log.m2_painted,
      notes: log.notes,
    }))
    const { error } = await supabase.from('work_logs').insert(inserts)
    if (!error) {
      await fetchLogs()
      toast(`Skopiowano ${inserts.length} wpisów`)
    } else {
      toast('Błąd kopiowania', 'error')
    }
  }

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  const kd = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action()
    if (e.key === 'Escape') { setEditId(null); setShowAdd(false) }
  }

  // Group logs by worker for summary
  const byWorker = logs.reduce<Record<string, { hours: number; cost: number }>>((acc, l) => {
    if (!acc[l.worker_name]) acc[l.worker_name] = { hours: 0, cost: 0 }
    acc[l.worker_name].hours += l.hours
    acc[l.worker_name].cost += l.cost
    return acc
  }, {})

  const totalHours = logs.reduce((s, l) => s + l.hours, 0)
  const totalCost = logs.reduce((s, l) => s + l.cost, 0)

  const ic = 'w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500'
  const sc = 'w-full bg-transparent border-b border-gray-300 px-0.5 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500'

  const selectedDayName = dayNames[new Date(selectedDate).getDay()]
  const isToday = selectedDate === today

  return (
    <div className="space-y-4">
      {/* Header with date navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-gray-900">Dziennik pracy</h1>
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-1">
            <button onClick={() => shiftDate(-1)} className="rounded p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="border-none bg-transparent px-1 py-1 text-xs font-medium text-gray-800 outline-none" />
            <button onClick={() => shiftDate(1)} className="rounded p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <span className={`text-xs font-medium ${isToday ? 'text-amber-600' : 'text-gray-500'}`}>
            {selectedDayName}{isToday ? ' (dziś)' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyPreviousDay} className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50">
            <Copy className="h-3 w-3" /> Kopiuj z wczoraj
          </button>
          {!showAdd && (
            <button onClick={() => { setShowAdd(true); if (!newOp && operations.length > 0) setNewOp(operations[0]) }}
              className="flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-400">
              <Plus className="h-3 w-3" /> Dodaj wpis
            </button>
          )}
        </div>
      </div>

      {/* Week quick nav */}
      <div className="flex gap-1">
        {weekDates.map((d) => {
          const dd = new Date(d)
          const dayLabel = dayNames[dd.getDay()].slice(0, 2)
          const dayNum = dd.getDate()
          const isSelected = d === selectedDate
          const isTd = d === today
          return (
            <button key={d} onClick={() => setSelectedDate(d)}
              className={`flex-1 rounded-md px-1 py-1.5 text-center text-[10px] font-medium transition-colors ${
                isSelected ? 'bg-amber-500 text-white' : isTd ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}>
              <div>{dayLabel}</div>
              <div className="text-xs font-bold">{dayNum}</div>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Pracownik</th>
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Operacja</th>
              <th className="px-2 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">Godziny</th>
              <th className="px-2 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">Stawka</th>
              <th className="px-2 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">Koszt</th>
              <th className="px-2 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">m²</th>
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Uwagi</th>
              <th className="px-1 py-1.5 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                <div className="flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" /></div>
              </td></tr>
            ) : (
              <>
                {logs.map((log) => {
                  if (editId === log.id) return (
                    <tr key={log.id} className="border-b border-gray-100 bg-blue-50/30">
                      <td className="px-2 py-1">
                        <select value={editWorker} onChange={(e) => handleEditWorkerChange(e.target.value)} className={sc}>
                          {activeWorkers.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <select value={editOp} onChange={(e) => setEditOp(e.target.value)} className={sc}>
                          {operations.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1"><input type="number" step="0.5" value={editHours} onChange={(e) => setEditHours(e.target.value)} className={`${ic} text-center w-16`} onKeyDown={(e) => kd(e, saveEdit)} /></td>
                      <td className="px-2 py-1"><input type="number" value={editRate} onChange={(e) => setEditRate(e.target.value)} className={`${ic} text-center w-16`} onKeyDown={(e) => kd(e, saveEdit)} /></td>
                      <td className="px-2 py-1 text-center text-amber-600 font-medium">{fmtPL(Number(editHours || 0) * Number(editRate || 0))}</td>
                      <td className="px-2 py-1"><input type="number" step="0.01" value={editM2} onChange={(e) => setEditM2(e.target.value)} className={`${ic} text-center w-16`} onKeyDown={(e) => kd(e, saveEdit)} /></td>
                      <td className="px-2 py-1"><input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className={ic} onKeyDown={(e) => kd(e, saveEdit)} /></td>
                      <td className="px-1 py-1 flex gap-0.5">
                        <button onClick={saveEdit} className="rounded p-0.5 text-emerald-500 hover:text-emerald-700"><Check className="h-3 w-3" /></button>
                        <button onClick={() => setEditId(null)} className="rounded p-0.5 text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                      </td>
                    </tr>
                  )
                  return (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => startEdit(log)}>
                      <td className="px-2 py-1.5 font-medium text-gray-800">{log.worker_name}</td>
                      <td className="px-2 py-1.5 text-gray-600">{log.operation}</td>
                      <td className="px-2 py-1.5 text-center text-gray-800">{log.hours}h</td>
                      <td className="px-2 py-1.5 text-center text-gray-500">{log.hourly_rate} zł</td>
                      <td className="px-2 py-1.5 text-center text-amber-600 font-medium">{fmtPL(log.cost)} zł</td>
                      <td className="px-2 py-1.5 text-center text-gray-500">{log.m2_painted != null ? fmtPL(log.m2_painted) : '—'}</td>
                      <td className="px-2 py-1.5 text-gray-400 truncate max-w-[120px]">{log.notes || ''}</td>
                      <td className="px-1 py-1.5" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleDelete(log.id)} className="rounded p-0.5 text-gray-300 hover:text-red-500 hover:bg-red-50"><Trash2 className="h-3 w-3" /></button>
                      </td>
                    </tr>
                  )
                })}

                {/* Add row */}
                {showAdd && (
                  <tr className="border-b border-gray-100 bg-amber-50/30">
                    <td className="px-2 py-1">
                      <select value={newWorker} onChange={(e) => handleWorkerChange(e.target.value)} className={sc} autoFocus>
                        {activeWorkers.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select value={newOp} onChange={(e) => setNewOp(e.target.value)} className={sc}>
                        {operations.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1"><input type="number" step="0.5" value={newHours} onChange={(e) => setNewHours(e.target.value)} placeholder="0" className={`${ic} text-center w-16`} onKeyDown={(e) => kd(e, handleAdd)} /></td>
                    <td className="px-2 py-1"><input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} className={`${ic} text-center w-16`} onKeyDown={(e) => kd(e, handleAdd)} /></td>
                    <td className="px-2 py-1 text-center text-amber-600 font-medium">{fmtPL(Number(newHours || 0) * Number(newRate || 0))}</td>
                    <td className="px-2 py-1"><input type="number" step="0.01" value={newM2} onChange={(e) => setNewM2(e.target.value)} placeholder="—" className={`${ic} text-center w-16`} onKeyDown={(e) => kd(e, handleAdd)} /></td>
                    <td className="px-2 py-1"><input type="text" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Uwagi..." className={ic} onKeyDown={(e) => kd(e, handleAdd)} /></td>
                    <td className="px-1 py-1 flex gap-0.5">
                      <button onClick={handleAdd} className="rounded p-0.5 text-emerald-500 hover:text-emerald-700"><Check className="h-3 w-3" /></button>
                      <button onClick={() => setShowAdd(false)} className="rounded p-0.5 text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                    </td>
                  </tr>
                )}

                {/* Empty state */}
                {!loading && logs.length === 0 && !showAdd && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400 text-xs">
                    Brak wpisów na ten dzień
                  </td></tr>
                )}
              </>
            )}
          </tbody>
          {/* Footer totals */}
          {logs.length > 0 && (
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50 font-medium">
                <td className="px-2 py-1.5 text-gray-700">Razem</td>
                <td className="px-2 py-1.5"></td>
                <td className="px-2 py-1.5 text-center text-gray-800">{totalHours}h</td>
                <td className="px-2 py-1.5"></td>
                <td className="px-2 py-1.5 text-center text-amber-600 font-bold">{fmtPL(totalCost)} zł</td>
                <td className="px-2 py-1.5"></td>
                <td className="px-2 py-1.5" colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Summary per worker */}
      {Object.keys(byWorker).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(byWorker).map(([name, data]) => (
            <div key={name} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="text-xs font-medium text-gray-800">{name}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-sm font-bold text-amber-600">{fmtPL(data.cost)} zł</span>
                <span className="text-[10px] text-gray-400">{data.hours}h</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
