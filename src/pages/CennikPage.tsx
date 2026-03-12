import { useState } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { usePaintingVariants } from '../hooks/usePaintingVariants'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

export default function CennikPage() {
  const { variants, loading, refetch } = usePaintingVariants()
  const { toast } = useToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editSides, setEditSides] = useState(2)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newSides, setNewSides] = useState(2)

  const startEdit = (v: typeof variants[number]) => {
    setEditingId(v.id)
    setEditName(v.name)
    setEditPrice(String(v.default_price_per_m2))
    setEditSides(v.sides)
  }

  const saveEdit = async () => {
    if (!editingId || !editName.trim() || !editPrice) return
    await supabase.from('painting_variants').update({
      name: editName.trim(),
      default_price_per_m2: Number(editPrice),
      sides: editSides,
    }).eq('id', editingId)
    setEditingId(null)
    toast('Wariant zaktualizowany')
    refetch()
  }

  const handleAdd = async () => {
    if (!newName.trim() || !newPrice) return
    await supabase.from('painting_variants').insert({
      name: newName.trim(),
      default_price_per_m2: Number(newPrice),
      sides: newSides,
    })
    setNewName('')
    setNewPrice('')
    setNewSides(2)
    setShowAdd(false)
    toast('Wariant dodany')
    refetch()
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Usunąć wariant "${name}"?`)) return
    const { error } = await supabase.from('painting_variants').delete().eq('id', id)
    if (error) {
      toast('Nie można usunąć — wariant jest używany w zamówieniach', 'error')
    } else {
      toast('Wariant usunięty')
      refetch()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" />
      </div>
    )
  }

  // Pair up main variants with their "+ MDF" counterparts
  const mdfVariants = new Map(
    variants
      .filter((v) => v.name.includes('(+ MDF)'))
      .map((v) => [v.name.replace(' (+ MDF)', ''), v])
  )
  const mainVariants = variants.filter((v) => !v.name.includes('(+ MDF)'))
  const hasMdfColumn = mdfVariants.size > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between max-w-lg">
        <h1 className="text-xl font-bold text-gray-900">Cennik 2026</h1>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400">
          <Plus className="h-4 w-4" /> Dodaj wariant
        </button>
      </div>

      {showAdd && (
        <div className="flex items-end gap-2 rounded-lg bg-gray-50 p-4 max-w-lg">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Nazwa</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="np. Gładkie mat biały"
              className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Cena/m²</label>
            <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="0"
              className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>
          <div className="w-24">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Strony</label>
            <select value={newSides} onChange={(e) => setNewSides(Number(e.target.value))}
              className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30">
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>
          <button onClick={handleAdd} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400">Dodaj</button>
          <button onClick={() => setShowAdd(false)} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100">Anuluj</button>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden max-w-lg">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Wariant</th>
              <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Cena/m²</th>
              {hasMdfColumn && (
                <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">+ MDF</th>
              )}
              <th className="px-2 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">Strony</th>
              <th className="px-1 py-1.5 w-14"></th>
            </tr>
          </thead>
          <tbody>
            {mainVariants.map((v) => {
              const mdfV = mdfVariants.get(v.name)
              return (
                <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                  {editingId === v.id ? (
                    <>
                      <td className="px-2 py-1">
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded bg-white border border-gray-300 px-1.5 py-0.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                          className="w-16 ml-auto block rounded bg-white border border-gray-300 px-1.5 py-0.5 text-right text-xs text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
                      </td>
                      {hasMdfColumn && <td className="px-2 py-1" />}
                      <td className="px-2 py-1 text-center">
                        <select value={editSides} onChange={(e) => setEditSides(Number(e.target.value))}
                          className="rounded bg-white border border-gray-300 px-1 py-0.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30">
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                        </select>
                      </td>
                      <td className="px-1 py-1 text-right">
                        <button onClick={saveEdit} className="rounded-md p-1 text-amber-600 hover:bg-amber-50">
                          <Save className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-1.5 text-gray-800 font-medium">{v.name}</td>
                      <td className="py-1.5 pr-5 text-right text-amber-600 font-semibold tabular-nums">{v.default_price_per_m2}</td>
                      {hasMdfColumn && (
                        <td className="py-1.5 pr-5 text-right text-amber-600 font-semibold tabular-nums">
                          {mdfV ? mdfV.default_price_per_m2 : ''}
                        </td>
                      )}
                      <td className="px-2 py-1.5 text-center text-gray-500">{v.sides}</td>
                      <td className="px-1 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => startEdit(v)} className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                            <Save className="h-3 w-3" />
                          </button>
                          <button onClick={() => handleDelete(v.id, v.name)} className="rounded-md p-1 text-gray-400 hover:text-red-500 hover:bg-red-50">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
            {mainVariants.length === 0 && (
              <tr>
                <td colSpan={hasMdfColumn ? 5 : 4} className="px-4 py-12 text-center text-gray-400">Brak wariantów</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
