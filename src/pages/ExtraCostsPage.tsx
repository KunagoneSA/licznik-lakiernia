import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

const MONTH_NAMES = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']

function fmtPL(n: number, d = 2) {
  return n.toFixed(d).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

interface ExtraCost { id: string; date: string; description: string; amount: number; created_by_email: string | null }

export default function ExtraCostsPage() {
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [costs, setCosts] = useState<ExtraCost[]>([])
  const [loading, setLoading] = useState(true)
  const [newDesc, setNewDesc] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editAmount, setEditAmount] = useState('')

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

  const shiftMonth = (dir: number) => {
    let m = month + dir, y = year
    if (m < 0) { m = 11; y-- } if (m > 11) { m = 0; y++ }
    setMonth(m); setYear(y)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('extra_costs').select('*').gte('date', dateFrom).lte('date', dateTo).order('date', { ascending: true })
    if (!isAdmin) {
      query = query.eq('created_by_email', user?.email ?? '')
    }
    const { data } = await query
    setCosts((data ?? []) as ExtraCost[])
    setLoading(false)
  }, [dateFrom, dateTo, isAdmin, user?.email])

  useEffect(() => { fetchData() }, [fetchData])

  const total = useMemo(() => costs.reduce((s, c) => s + Number(c.amount), 0), [costs])

  const addCost = async () => {
    if (!newDesc || !newAmount) return
    await supabase.from('extra_costs').insert({
      date: dateFrom,
      description: newDesc,
      amount: Math.round(Number(newAmount) * 100) / 100,
      created_by_email: user?.email ?? null,
    })
    setNewDesc(''); setNewAmount(''); toast('Koszt dodany'); fetchData()
  }

  const startEdit = (c: ExtraCost) => {
    setEditId(c.id); setEditDesc(c.description); setEditAmount(String(c.amount))
  }

  const saveEdit = async () => {
    if (!editId || !editDesc || !editAmount) return
    await supabase.from('extra_costs').update({ description: editDesc, amount: Math.round(Number(editAmount) * 100) / 100 }).eq('id', editId)
    setEditId(null); toast('Zaktualizowano'); fetchData()
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">Dodatkowe koszty</h1>

      <div className="flex items-center gap-2">
        <button onClick={() => shiftMonth(-1)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[160px] text-center text-sm font-semibold text-gray-800">
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={() => shiftMonth(1)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" /></div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {isAdmin && <th className="px-3 py-1.5 text-left font-medium text-gray-500">Kto</th>}
                <th className="px-3 py-1.5 text-left font-medium text-gray-500">Data</th>
                <th className="px-3 py-1.5 text-left font-medium text-gray-500">Opis</th>
                <th className="px-3 py-1.5 text-right font-medium text-gray-500">Kwota</th>
                <th className="px-1 py-1.5 w-6"></th>
              </tr>
            </thead>
            <tbody>
              {costs.map((c, idx) => (
                editId === c.id ? (
                  <tr key={c.id} className="border-b border-gray-50 bg-blue-50/30"
                    onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) saveEdit() }}>
                    {isAdmin && <td className="px-3 py-1.5 text-gray-400 text-[10px]">{(c.created_by_email ?? '').split('@')[0]}</td>}
                    <td className="px-3 py-1.5 text-gray-600">{c.date}</td>
                    <td className="px-3 py-1.5">
                      <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500"
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null) }} autoFocus />
                    </td>
                    <td className="px-3 py-1.5">
                      <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-right text-gray-800 outline-none focus:border-amber-500"
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null) }} />
                    </td>
                    <td className="px-1 py-1.5">
                      <button onClick={() => setEditId(null)} className="rounded p-0.5 text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${idx % 2 === 1 ? 'bg-gray-50/30' : ''}`} onClick={() => startEdit(c)}>
                    {isAdmin && <td className="px-3 py-1.5 text-gray-400 text-[10px]">{(c.created_by_email ?? '').split('@')[0]}</td>}
                    <td className="px-3 py-1.5 text-gray-600">{c.date}</td>
                    <td className="px-3 py-1.5 text-gray-800">{c.description}</td>
                    <td className="px-3 py-1.5 text-right text-rose-600 tabular-nums">{fmtPL(Number(c.amount))} zł</td>
                    <td className="px-1 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <button onClick={async () => {
                        await supabase.from('extra_costs').delete().eq('id', c.id)
                        toast('Usunięto'); fetchData()
                      }} className="rounded p-0.5 text-gray-300 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                    </td>
                  </tr>
                )
              ))}
              {costs.length > 0 && (
                <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                  <td className="px-3 py-1.5 text-gray-700" colSpan={isAdmin ? 3 : 2}>Razem</td>
                  <td className="px-3 py-1.5 text-right text-rose-600 tabular-nums">{fmtPL(total)} zł</td>
                  <td></td>
                </tr>
              )}
              {costs.length === 0 && (
                <tr><td colSpan={isAdmin ? 5 : 4} className="px-3 py-6 text-center text-gray-400">Brak wpisów w tym miesiącu</td></tr>
              )}
              {/* Inline add */}
              <tr className="border-t border-gray-200 bg-amber-50/30">
                {isAdmin && <td></td>}
                <td className="px-3 py-1.5 text-[10px] text-gray-400">{dateFrom}</td>
                <td className="px-3 py-1.5">
                  <input type="text" placeholder="Opis kosztu..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-amber-500"
                    onKeyDown={(e) => { if (e.key === 'Enter') addCost() }} />
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" placeholder="0,00" value={newAmount} onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full bg-transparent border-b border-gray-300 px-1 py-0.5 text-xs text-right text-gray-800 outline-none focus:border-amber-500"
                    onKeyDown={(e) => { if (e.key === 'Enter') addCost() }} />
                </td>
                <td className="px-1 py-1.5">
                  <button onClick={addCost} disabled={!newDesc || !newAmount}
                    className="rounded p-0.5 text-amber-500 hover:text-amber-700 disabled:opacity-30"><Plus className="h-3 w-3" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
