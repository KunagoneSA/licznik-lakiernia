import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useClients } from '../hooks/useClients'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function NewOrderModal({ onClose, onSaved }: Props) {
  const { clients } = useClients()
  const [clientId, setClientId] = useState('')
  const [description, setDescription] = useState('')
  const [plannedDate, setPlannedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!clientId) return
    setSaving(true)
    const { error } = await supabase.from('orders').insert({
      client_id: clientId,
      description: description || null,
      planned_date: plannedDate || null,
      notes: notes || null,
    })
    setSaving(false)
    if (!error) onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-zinc-800 border border-zinc-700 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Nowe zamówienie</h2>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase mb-1">Klient *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="">Wybierz klienta...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase mb-1">Opis</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="np. Fronty frezowane 9016 MAT"
              className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase mb-1">Planowana data</label>
            <input
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase mb-1">Notatki</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-700">
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={!clientId || saving}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? 'Zapisywanie...' : 'Utwórz'}
          </button>
        </div>
      </div>
    </div>
  )
}
