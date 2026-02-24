import { useState } from 'react'
import { X } from 'lucide-react'
import type { PaintingVariant } from '../types/database'

interface Props {
  variants: PaintingVariant[]
  getPrice: (variantId: string) => number
  onClose: () => void
  onSave: (item: { length_mm: number; width_mm: number; quantity: number; variant_id: string; has_handle: boolean; notes: string | null; m2: number; price_per_m2: number; total_price: number }) => void
}

export default function OrderItemFormModal({ variants, getPrice, onClose, onSave }: Props) {
  const [lengthMm, setLengthMm] = useState(0)
  const [widthMm, setWidthMm] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [variantId, setVariantId] = useState(variants[0]?.id ?? '')
  const [hasHandle, setHasHandle] = useState(false)
  const [notes, setNotes] = useState('')

  const variant = variants.find((v) => v.id === variantId)
  const sides = variant?.sides ?? 2
  const pricePerM2 = getPrice(variantId)
  const m2 = (lengthMm * widthMm * quantity * sides) / 1_000_000
  const totalPrice = m2 * pricePerM2

  const handleSave = () => {
    if (!lengthMm || !widthMm || !variantId) return
    onSave({
      length_mm: lengthMm,
      width_mm: widthMm,
      quantity,
      variant_id: variantId,
      has_handle: hasHandle,
      notes: notes || null,
      m2: Math.round(m2 * 10000) / 10000,
      price_per_m2: pricePerM2,
      total_price: Math.round(totalPrice * 100) / 100,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white border border-gray-200 shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Dodaj element</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Długość (mm)</label>
            <input type="number" value={lengthMm || ''} onChange={(e) => setLengthMm(Number(e.target.value))}
              className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Szerokość (mm)</label>
            <input type="number" value={widthMm || ''} onChange={(e) => setWidthMm(Number(e.target.value))}
              className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Ilość</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} min={1}
              className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Rodzaj</label>
            <select value={variantId} onChange={(e) => setVariantId(e.target.value)}
              className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30">
              {variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={hasHandle} onChange={(e) => setHasHandle(e.target.checked)}
                className="rounded border-gray-300 bg-white text-amber-500 focus:ring-amber-500/30" />
              Uchwyt
            </label>
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Notatki</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-500/30" />
        </div>

        <div className="mt-4 rounded-lg bg-gray-50 p-3 grid grid-cols-3 gap-2 text-sm">
          <div><span className="text-gray-400">m2:</span> <span className="text-gray-800 font-medium">{m2.toFixed(4)}</span></div>
          <div><span className="text-gray-400">Cena/m2:</span> <span className="text-gray-800 font-medium">{pricePerM2} zl</span></div>
          <div><span className="text-gray-400">Razem:</span> <span className="text-amber-600 font-bold">{totalPrice.toFixed(2)} zl</span></div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100">Anuluj</button>
          <button onClick={handleSave} disabled={!lengthMm || !widthMm}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50">
            Dodaj
          </button>
        </div>
      </div>
    </div>
  )
}
