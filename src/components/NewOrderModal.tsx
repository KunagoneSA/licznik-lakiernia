import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useClients } from '../hooks/useClients'
import { useToast } from '../contexts/ToastContext'
import { useModalKeys } from '../hooks/useModalKeys'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function NewOrderModal({ onClose, onSaved }: Props) {
  const { clients } = useClients()
  const { toast } = useToast()
  const [clientId, setClientId] = useState('')
  const [description, setDescription] = useState('')
  const [plannedDate, setPlannedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  useModalKeys(onClose)

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
    if (!error) {
      toast('Zamówienie utworzone')
      onSaved()
    } else {
      toast('Błąd zapisu zamówienia', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white border border-gray-200 shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Nowe zamówienie</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Klient *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30"
            >
              <option value="">Wybierz klienta...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Opis</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="np. Fronty frezowane 9016 MAT"
              className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Planowana data</label>
            <input
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Notatki</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100">
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={!clientId || saving}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? 'Zapisywanie...' : 'Utwórz'}
          </button>
        </div>
      </div>
    </div>
  )
}
