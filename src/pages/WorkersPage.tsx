import { useState } from 'react'
import { Plus, Trash2, Check, X } from 'lucide-react'
import { useWorkers } from '../hooks/useWorkers'
import { useToast } from '../contexts/ToastContext'

export default function WorkersPage() {
  const { workers, loading, addWorker, updateWorker, deleteWorker } = useWorkers()
  const { toast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRate, setNewRate] = useState('35')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRate, setEditRate] = useState('')
  const [editActive, setEditActive] = useState(true)

  const handleAdd = async () => {
    if (!newName.trim()) return
    const err = await addWorker(newName.trim(), Number(newRate) || 35)
    if (!err) {
      toast('Pracownik dodany')
      setNewName('')
      setNewRate('35')
      setShowAdd(false)
    } else {
      toast('Błąd — może taka nazwa już istnieje?', 'error')
    }
  }

  const startEdit = (w: typeof workers[0]) => {
    setEditId(w.id)
    setEditName(w.name)
    setEditRate(String(w.hourly_rate))
    setEditActive(w.active)
  }

  const saveEdit = async () => {
    if (!editId || !editName.trim()) return
    await updateWorker(editId, {
      name: editName.trim(),
      hourly_rate: Number(editRate) || 35,
      active: editActive,
    })
    setEditId(null)
    toast('Pracownik zaktualizowany')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Usunąć pracownika?')) return
    await deleteWorker(id)
    toast('Pracownik usunięty')
  }

  const kd = (e: React.KeyboardEvent, action: () => void, cancel: () => void) => {
    if (e.key === 'Enter') action()
    if (e.key === 'Escape') cancel()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 max-w-lg">
        <h1 className="text-xl font-bold text-gray-900">Pracownicy</h1>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400">
            <Plus className="h-4 w-4" /> Dodaj
          </button>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden max-w-lg">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Imię</th>
              {/* <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Stawka/h</th> */}
              <th className="px-2 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">Aktywny</th>
              <th className="px-1 py-1.5 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => {
              if (editId === w.id) {
                const ic = "w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500"
                return (
                  <tr key={w.id} className="border-b border-gray-100 bg-blue-50/30">
                    <td className="px-2 py-1">
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                        className={ic} onKeyDown={(e) => kd(e, saveEdit, () => setEditId(null))} autoFocus />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)}
                        className="h-3 w-3 rounded border-gray-300 text-amber-500 focus:ring-amber-500/30" />
                    </td>
                    <td className="px-1 py-1 flex gap-0.5">
                      <button onClick={saveEdit} className="rounded p-0.5 text-emerald-500 hover:text-emerald-700"><Check className="h-3 w-3" /></button>
                      <button onClick={() => setEditId(null)} className="rounded p-0.5 text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                    </td>
                  </tr>
                )
              }
              return (
                <tr key={w.id} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!w.active ? 'opacity-40' : ''}`}
                  onClick={() => startEdit(w)}>
                  <td className="px-2 py-1.5 font-medium text-gray-800">{w.name}</td>
                  {/* <td className="px-2 py-1.5 text-right text-gray-600 tabular-nums">{w.hourly_rate} zł</td> */}
                  <td className="px-2 py-1.5 text-center text-gray-500">{w.active ? '✓' : ''}</td>
                  <td className="px-1 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleDelete(w.id)} className="rounded p-0.5 text-gray-400 hover:text-red-600 hover:bg-gray-100">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {showAdd && (() => {
              const ic = "w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500"
              return (
                <tr className="border-b border-gray-100 bg-amber-50/30">
                  <td className="px-2 py-1">
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                      placeholder="Imię" className={ic} autoFocus
                      onKeyDown={(e) => kd(e, handleAdd, () => setShowAdd(false))} />
                  </td>
                  <td className="px-2 py-1 text-center text-gray-400">✓</td>
                  <td className="px-1 py-1">
                    <button onClick={() => setShowAdd(false)} className="rounded p-0.5 text-gray-400 hover:text-gray-600">
                      <X className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              )
            })()}
          </tbody>
        </table>
      </div>
    </div>
  )
}
