import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Check, X, ChevronLeft, ChevronRight, Copy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useWorkers } from '../hooks/useWorkers'
import { useOperations } from '../hooks/useOperations'
import { useToast } from '../contexts/ToastContext'
import type { WorkLog } from '../types/database'

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

  const getWorkerRate = (name: string) => workers.find(w => w.name === name)?.hourly_rate ?? 35

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [newWorker, setNewWorker] = useState('')
  const [newOp, setNewOp] = useState('')
  const [newHours, setNewHours] = useState('')
  const [newNotes, setNewNotes] = useState('')

  // Edit
  const [editId, setEditId] = useState<string | null>(null)
  const [editWorker, setEditWorker] = useState('')
  const [editOp, setEditOp] = useState('')
  const [editHours, setEditHours] = useState('')
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
    }
  }, [activeWorkers.length])

  const resetAdd = () => {
    setNewHours('')
    setNewNotes('')
    if (operations.length > 0) setNewOp(operations[0])
  }

  const handleAdd = async () => {
    const h = Number(newHours)
    if (!h || !newWorker) return
    const rate = getWorkerRate(newWorker)
    const { error } = await supabase.from('work_logs').insert({
      order_id: null,
      worker_name: newWorker,
      operation: newOp || operations[0],
      date: selectedDate,
      hours: h,
      hourly_rate: rate,
      cost: Math.round(h * rate * 100) / 100,
      m2_painted: null,
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
    setEditNotes(log.notes ?? '')
  }

  const saveEdit = async () => {
    if (!editId) return
    const h = Number(editHours)
    if (!h) return
    const rate = getWorkerRate(editWorker)
    const { error } = await supabase.from('work_logs').update({
      worker_name: editWorker,
      operation: editOp,
      hours: h,
      hourly_rate: rate,
      cost: Math.round(h * rate * 100) / 100,
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

  const kd = (e: React.KeyboardEvent, action: () => void, cancel?: () => void) => {
    if (e.key === 'Enter') action()
    if (e.key === 'Escape') { cancel ? cancel() : setEditId(null) }
  }

  const totalHours = logs.reduce((s, l) => s + l.hours, 0)

  const ic = 'w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500'

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
              className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-100">
              <Plus className="h-3 w-3" /> Dodaj
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

      {/* Table — identical style to OrderDetailPage "Etapy pracy" */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 w-28">Pracownik</th>
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 w-1/4">Operacja</th>
              <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 w-16">Godz</th>
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 w-1/3">Uwagi</th>
              <th className="px-1 py-1.5 w-6"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                <div className="flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" /></div>
              </td></tr>
            ) : (
              <>
                {logs.map((log) => {
                  if (editId === log.id) return (
                    <tr key={log.id} className="border-b border-gray-100 bg-blue-50/30">
                      <td className="px-2 py-1">
                        <select value={editWorker} onChange={(e) => setEditWorker(e.target.value)} className={ic} onKeyDown={(e) => kd(e, saveEdit, () => setEditId(null))}>
                          {activeWorkers.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <select value={editOp} onChange={(e) => setEditOp(e.target.value)} className={ic} onKeyDown={(e) => kd(e, saveEdit, () => setEditId(null))}>
                          {operations.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1"><input type="number" step="0.5" value={editHours} onChange={(e) => setEditHours(e.target.value)} className={`${ic} text-right tabular-nums`} onKeyDown={(e) => kd(e, saveEdit, () => setEditId(null))} /></td>
                      <td className="px-2 py-1"><input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-[10px] text-gray-600 outline-none focus:border-amber-500" onKeyDown={(e) => kd(e, saveEdit, () => setEditId(null))} /></td>
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
                      <td className="px-2 py-1.5 text-right text-gray-600 tabular-nums">{log.hours}</td>
                      <td className="px-2 py-1.5 text-gray-400 text-[10px]">{log.notes || ''}</td>
                      <td className="px-1 py-1.5" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleDelete(log.id)} className="rounded p-0.5 text-gray-400 hover:text-red-600 hover:bg-gray-100">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {/* Add row */}
                {showAdd && (
                  <tr className="border-b border-gray-100 bg-amber-50/30">
                    <td className="px-2 py-1">
                      <select value={newWorker} onChange={(e) => setNewWorker(e.target.value)} className={ic} autoFocus onKeyDown={(e) => kd(e, handleAdd, () => setShowAdd(false))}>
                        {activeWorkers.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select value={newOp} onChange={(e) => setNewOp(e.target.value)} className={ic} onKeyDown={(e) => kd(e, handleAdd, () => setShowAdd(false))}>
                        {operations.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input type="number" step="0.5" value={newHours} onChange={(e) => setNewHours(e.target.value)}
                        placeholder="0" className={`${ic} text-right tabular-nums`} onKeyDown={(e) => kd(e, handleAdd, () => setShowAdd(false))} />
                    </td>
                    <td className="px-2 py-1">
                      <input type="text" value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
                        placeholder="uwagi"
                        className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-[10px] text-gray-600 outline-none focus:border-amber-500"
                        onKeyDown={(e) => kd(e, handleAdd, () => setShowAdd(false))} />
                    </td>
                    <td className="px-1 py-1">
                      <button onClick={() => setShowAdd(false)} className="rounded p-0.5 text-gray-400 hover:text-gray-600">
                        <X className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                )}

                {/* Empty state */}
                {!loading && logs.length === 0 && !showAdd && (
                  <tr><td colSpan={5} className="px-2 py-6 text-center text-xs text-gray-400">
                    Brak wpisów na ten dzień
                  </td></tr>
                )}
              </>
            )}
          </tbody>
          {logs.length > 0 && (
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50 font-medium">
                <td className="px-2 py-1.5 text-gray-700">Razem</td>
                <td className="px-2 py-1.5"></td>
                <td className="px-2 py-1.5 text-right text-gray-800 tabular-nums">{totalHours}h</td>
                <td className="px-2 py-1.5" colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showAdd && (
        <div className="mt-1 flex gap-2 text-[10px] text-gray-400">
          <span>TAB = następne pole</span>
          <span>Enter = dodaj</span>
          <span>Esc = zamknij</span>
        </div>
      )}
    </div>
  )
}
