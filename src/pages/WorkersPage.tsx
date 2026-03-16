import { useState } from 'react'
import { Plus, Trash2, Check, X } from 'lucide-react'
import { useWorkers } from '../hooks/useWorkers'
import { useOperations } from '../hooks/useOperations'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'

export default function WorkersPage() {
  const { workers, loading, addWorker, updateWorker, deleteWorker, refetch: refetchWorkers } = useWorkers()
  const { operations, loading: opsLoading, addOperation, updateOperation, deleteOperation, refetch: refetchOps } = useOperations()
  const { toast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRate, setNewRate] = useState('35')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRate, setEditRate] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [showAddOp, setShowAddOp] = useState(false)
  const [newOpName, setNewOpName] = useState('')
  const [editOpId, setEditOpId] = useState<string | null>(null)
  const [editOpName, setEditOpName] = useState('')

  const handleAdd = async () => {
    if (!newName.trim()) return
    const err = await addWorker(newName.trim(), Number(newRate) || 35)
    if (!err) { toast('Pracownik dodany'); setNewName(''); setNewRate('35'); setShowAdd(false) }
    else toast('Błąd — może taka nazwa już istnieje?', 'error')
  }
  const startEdit = (w: typeof workers[0]) => { setEditId(w.id); setEditName(w.name); setEditRate(String(w.hourly_rate)); setEditActive(w.active) }
  const saveEdit = async () => {
    if (!editId || !editName.trim()) return
    await updateWorker(editId, { name: editName.trim(), hourly_rate: Number(editRate) || 35, active: editActive })
    setEditId(null); toast('Pracownik zaktualizowany')
  }
  const handleDelete = async (id: string) => {
    const deleted = workers.find(w => w.id === id)
    await deleteWorker(id)
    toast('Pracownik usunięty', 'success', { label: 'Cofnij', onClick: async () => {
      if (!deleted) return
      await supabase.from('workers').insert({ name: deleted.name, hourly_rate: deleted.hourly_rate, active: deleted.active })
      refetchWorkers(); toast('Pracownik przywrócony')
    }})
  }
  const handleAddOp = async () => {
    if (!newOpName.trim()) return
    const err = await addOperation(newOpName.trim())
    if (!err) { toast('Operacja dodana'); setNewOpName(''); setShowAddOp(false) }
    else toast('Błąd — może taka nazwa już istnieje?', 'error')
  }
  const startEditOp = (op: typeof operations[0]) => { setEditOpId(op.id); setEditOpName(op.name) }
  const saveEditOp = async () => {
    if (!editOpId || !editOpName.trim()) return
    await updateOperation(editOpId, { name: editOpName.trim() })
    setEditOpId(null); toast('Operacja zaktualizowana')
  }
  const handleDeleteOp = async (id: string) => {
    const deleted = operations.find(o => o.id === id)
    await deleteOperation(id)
    toast('Operacja usunięta', 'success', { label: 'Cofnij', onClick: async () => {
      if (!deleted) return
      await supabase.from('operations').insert({ name: deleted.name, sort_order: deleted.sort_order, active: deleted.active })
      refetchOps(); toast('Operacja przywrócona')
    }})
  }
  const kd = (e: React.KeyboardEvent, action: () => void, cancel: () => void) => {
    if (e.key === 'Enter') action()
    if (e.key === 'Escape') cancel()
  }

  if (loading || opsLoading) {
    return (<div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" /></div>)
  }

  const ic = "w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500"

  return (
    <div className="flex gap-8 items-start">
      {/* Workers */}
      <div className="space-y-3 flex-1 max-w-md">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold text-gray-900">Pracownicy</h1>
          {!showAdd && <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-400"><Plus className="h-3 w-3" /> Dodaj</button>}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Imię</th>
              <th className="px-2 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">Aktywny</th>
              <th className="px-1 py-1.5 w-12"></th>
            </tr></thead>
            <tbody>
              {workers.map((w) => {
                if (editId === w.id) return (
                  <tr key={w.id} className="border-b border-gray-100 bg-blue-50/30">
                    <td className="px-2 py-1"><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={ic} onKeyDown={(e) => kd(e, saveEdit, () => setEditId(null))} autoFocus /></td>
                    <td className="px-2 py-1 text-center"><input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} className="h-3 w-3 rounded border-gray-300 text-amber-500 focus:ring-amber-500/30" /></td>
                    <td className="px-1 py-1 flex gap-0.5">
                      <button onClick={saveEdit} className="rounded p-0.5 text-emerald-500 hover:text-emerald-700"><Check className="h-3 w-3" /></button>
                      <button onClick={() => setEditId(null)} className="rounded p-0.5 text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                    </td>
                  </tr>
                )
                return (
                  <tr key={w.id} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!w.active ? 'opacity-40' : ''}`} onClick={() => startEdit(w)}>
                    <td className="px-2 py-1.5 font-medium text-gray-800">{w.name}</td>
                    <td className="px-2 py-1.5 text-center text-gray-500">{w.active ? '✓' : ''}</td>
                    <td className="px-1 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleDelete(w.id)} className="rounded p-0.5 text-gray-300 hover:text-red-500 hover:bg-red-50"><Trash2 className="h-3 w-3" /></button>
                    </td>
                  </tr>
                )
              })}
              {showAdd && (
                <tr className="border-b border-gray-100 bg-amber-50/30">
                  <td className="px-2 py-1"><input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Imię" className={ic} autoFocus onKeyDown={(e) => kd(e, handleAdd, () => setShowAdd(false))} /></td>
                  <td className="px-2 py-1 text-center text-gray-400">✓</td>
                  <td className="px-1 py-1"><button onClick={() => setShowAdd(false)} className="rounded p-0.5 text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operations */}
      <div className="space-y-3 flex-1 max-w-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold text-gray-900">Operacje</h1>
          {!showAddOp && <button onClick={() => setShowAddOp(true)} className="flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-400"><Plus className="h-3 w-3" /> Dodaj</button>}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Nazwa</th>
              <th className="px-1 py-1.5 w-12"></th>
            </tr></thead>
            <tbody>
              {operations.map((op) => {
                if (editOpId === op.id) return (
                  <tr key={op.id} className="border-b border-gray-100 bg-blue-50/30">
                    <td className="px-2 py-1"><input type="text" value={editOpName} onChange={(e) => setEditOpName(e.target.value)} className={ic} onKeyDown={(e) => kd(e, saveEditOp, () => setEditOpId(null))} autoFocus /></td>
                    <td className="px-1 py-1 flex gap-0.5">
                      <button onClick={saveEditOp} className="rounded p-0.5 text-emerald-500 hover:text-emerald-700"><Check className="h-3 w-3" /></button>
                      <button onClick={() => setEditOpId(null)} className="rounded p-0.5 text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                    </td>
                  </tr>
                )
                return (
                  <tr key={op.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => startEditOp(op)}>
                    <td className="px-2 py-1.5 font-medium text-gray-800">{op.name}</td>
                    <td className="px-1 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleDeleteOp(op.id)} className="rounded p-0.5 text-gray-300 hover:text-red-500 hover:bg-red-50"><Trash2 className="h-3 w-3" /></button>
                    </td>
                  </tr>
                )
              })}
              {showAddOp && (
                <tr className="border-b border-gray-100 bg-amber-50/30">
                  <td className="px-2 py-1"><input type="text" value={newOpName} onChange={(e) => setNewOpName(e.target.value)} placeholder="Nazwa operacji" className={ic} autoFocus onKeyDown={(e) => kd(e, handleAddOp, () => setShowAddOp(false))} /></td>
                  <td className="px-1 py-1"><button onClick={() => setShowAddOp(false)} className="rounded p-0.5 text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
