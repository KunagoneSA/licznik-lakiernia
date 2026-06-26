import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, X, AlertTriangle, MessageSquare, CheckCircle2, ShoppingCart, ImagePlus, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

type TicketType = 'awaria' | 'uwaga' | 'zapotrzebowanie'
type TicketStatus = 'otwarte' | 'w_trakcie' | 'zakonczone'

interface Ticket {
  id: string
  created_at: string
  type: TicketType
  title: string
  description: string | null
  status: TicketStatus
  created_by_email: string | null
}

interface TicketComment {
  id: string
  ticket_id: string
  text: string | null
  photo_url: string | null
  created_by_email: string | null
  created_at: string
}

const TYPE_LABEL: Record<TicketType, string> = { awaria: 'Awaria', uwaga: 'Uwaga', zapotrzebowanie: 'Zapotrzebowanie' }
const TYPE_COLOR: Record<TicketType, string> = { awaria: 'bg-red-100 text-red-700', uwaga: 'bg-blue-100 text-blue-700', zapotrzebowanie: 'bg-purple-100 text-purple-700' }
const STATUS_LABEL: Record<TicketStatus, string> = { otwarte: 'Otwarte', w_trakcie: 'W trakcie', zakonczone: 'Zakończone' }
const STATUS_COLOR: Record<TicketStatus, string> = {
  otwarte: 'bg-amber-100 text-amber-700',
  w_trakcie: 'bg-blue-100 text-blue-700',
  zakonczone: 'bg-emerald-100 text-emerald-700',
}

export default function TicketsPage() {
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'wszystkie' | 'otwarte' | 'w_trakcie' | 'zakonczone'>('otwarte')

  const [showForm, setShowForm] = useState(false)
  const [newType, setNewType] = useState<TicketType>('awaria')
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const [editId, setEditId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editType, setEditType] = useState<TicketType>('awaria')

  const [commentsByTicket, setCommentsByTicket] = useState<Record<string, TicketComment[]>>({})
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [openComments, setOpenComments] = useState<Set<string>>(new Set())
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [commentPhotos, setCommentPhotos] = useState<Record<string, File | null>>({})
  const [submittingComment, setSubmittingComment] = useState<string | null>(null)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('tickets').select('*').order('created_at', { ascending: false })
    setTickets((data ?? []) as Ticket[])
    const { data: countsData } = await supabase.from('ticket_comments').select('ticket_id')
    const counts: Record<string, number> = {}
    ;(countsData ?? []).forEach((c: { ticket_id: string }) => {
      counts[c.ticket_id] = (counts[c.ticket_id] ?? 0) + 1
    })
    setCommentCounts(counts)
    setLoading(false)
  }, [])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const filtered = useMemo(() => {
    if (filter === 'wszystkie') return tickets
    return tickets.filter(t => t.status === filter)
  }, [tickets, filter])

  const addTicket = async () => {
    if (!newTitle.trim()) return
    await supabase.from('tickets').insert({
      type: newType,
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      status: 'otwarte',
      created_by_email: user?.email ?? null,
    })
    setNewTitle(''); setNewDescription(''); setNewType('awaria'); setShowForm(false)
    toast('Zgłoszenie dodane'); fetchTickets()
  }

  const updateStatus = async (id: string, status: TicketStatus) => {
    await supabase.from('tickets').update({ status }).eq('id', id)
    fetchTickets()
  }

  const startEdit = (t: Ticket) => {
    setEditId(t.id); setEditTitle(t.title); setEditDescription(t.description ?? ''); setEditType(t.type)
  }

  const saveEdit = async () => {
    if (!editId || !editTitle.trim()) return
    await supabase.from('tickets').update({
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      type: editType,
    }).eq('id', editId)
    setEditId(null); toast('Zaktualizowano'); fetchTickets()
  }

  const deleteTicket = async (id: string) => {
    if (!confirm('Usunąć zgłoszenie? Komentarze zostaną także usunięte.')) return
    await supabase.from('tickets').delete().eq('id', id)
    toast('Usunięto'); fetchTickets()
  }

  const loadComments = async (ticketId: string) => {
    const { data } = await supabase.from('ticket_comments').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true })
    setCommentsByTicket(prev => ({ ...prev, [ticketId]: (data ?? []) as TicketComment[] }))
  }

  const toggleComments = async (ticketId: string) => {
    const next = new Set(openComments)
    if (next.has(ticketId)) {
      next.delete(ticketId)
    } else {
      next.add(ticketId)
      if (!commentsByTicket[ticketId]) await loadComments(ticketId)
    }
    setOpenComments(next)
  }

  const addComment = async (ticketId: string) => {
    const text = (commentDrafts[ticketId] ?? '').trim()
    const photo = commentPhotos[ticketId] ?? null
    if (!text && !photo) return
    setSubmittingComment(ticketId)
    try {
      let photoUrl: string | null = null
      if (photo) {
        const ext = photo.name.split('.').pop() ?? 'jpg'
        const path = `${ticketId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: upErr } = await supabase.storage.from('ticket-attachments').upload(path, photo, {
          contentType: photo.type, upsert: false,
        })
        if (upErr) { toast('Błąd uploadu zdjęcia'); console.error(upErr); setSubmittingComment(null); return }
        const { data: pub } = supabase.storage.from('ticket-attachments').getPublicUrl(path)
        photoUrl = pub.publicUrl
      }
      const { error: insErr } = await supabase.from('ticket_comments').insert({
        ticket_id: ticketId,
        text: text || null,
        photo_url: photoUrl,
        created_by_email: user?.email ?? null,
      })
      if (insErr) { toast('Błąd zapisu komentarza'); console.error(insErr); setSubmittingComment(null); return }
      setCommentDrafts(prev => ({ ...prev, [ticketId]: '' }))
      setCommentPhotos(prev => ({ ...prev, [ticketId]: null }))
      await loadComments(ticketId)
      setCommentCounts(prev => ({ ...prev, [ticketId]: (prev[ticketId] ?? 0) + 1 }))
      toast('Komentarz dodany')
    } finally {
      setSubmittingComment(null)
    }
  }

  const deleteComment = async (commentId: string, ticketId: string) => {
    if (!confirm('Usunąć komentarz?')) return
    await supabase.from('ticket_comments').delete().eq('id', commentId)
    await loadComments(ticketId)
    setCommentCounts(prev => ({ ...prev, [ticketId]: Math.max(0, (prev[ticketId] ?? 1) - 1) }))
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Zgłoszenia</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-400">
          <Plus className="h-4 w-4" /> Nowe zgłoszenie
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {(['otwarte', 'w_trakcie', 'zakonczone', 'wszystkie'] as const).map(t => {
          const isActive = filter === t
          const label = t === 'wszystkie' ? 'Wszystkie' : STATUS_LABEL[t as TicketStatus]
          return (
            <button key={t} onClick={() => setFilter(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${isActive ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {label}
            </button>
          )
        })}
      </div>

      {/* New ticket form */}
      {showForm && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setNewType('awaria')}
              className={`flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium ${newType === 'awaria' ? 'bg-red-500 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
              <AlertTriangle className="h-3 w-3" /> Awaria
            </button>
            <button onClick={() => setNewType('uwaga')}
              className={`flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium ${newType === 'uwaga' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
              <MessageSquare className="h-3 w-3" /> Uwaga
            </button>
            <button onClick={() => setNewType('zapotrzebowanie')}
              className={`flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium ${newType === 'zapotrzebowanie' ? 'bg-purple-500 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
              <ShoppingCart className="h-3 w-3" /> Zapotrzebowanie
            </button>
          </div>
          <input type="text" placeholder="Tytuł zgłoszenia..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500" autoFocus />
          <textarea placeholder="Opis (opcjonalnie)" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={3}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500" />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setNewTitle(''); setNewDescription('') }} className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">Anuluj</button>
            <button onClick={addTicket} disabled={!newTitle.trim()}
              className="rounded bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-30">Zapisz</button>
          </div>
        </div>
      )}

      {/* Tickets list */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-amber-500" /></div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">Brak zgłoszeń</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => {
            const isOpen = openComments.has(t.id)
            const comments = commentsByTicket[t.id] ?? []
            const cCount = commentCounts[t.id] ?? 0
            const draft = commentDrafts[t.id] ?? ''
            const photo = commentPhotos[t.id] ?? null
            return (
              <div key={t.id} className="rounded-lg border border-gray-200 bg-white p-3">
                {editId === t.id ? (
                  <div className="space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setEditType('awaria')}
                        className={`rounded px-2 py-1 text-xs font-medium ${editType === 'awaria' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Awaria</button>
                      <button onClick={() => setEditType('uwaga')}
                        className={`rounded px-2 py-1 text-xs font-medium ${editType === 'uwaga' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Uwaga</button>
                      <button onClick={() => setEditType('zapotrzebowanie')}
                        className={`rounded px-2 py-1 text-xs font-medium ${editType === 'zapotrzebowanie' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Zapotrzebowanie</button>
                    </div>
                    <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-amber-500" autoFocus />
                    <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-amber-500" />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditId(null)} className="rounded p-1 text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                      <button onClick={saveEdit} className="rounded bg-amber-500 px-3 py-1 text-xs font-medium text-white">Zapisz</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${TYPE_COLOR[t.type]}`}>{TYPE_LABEL[t.type]}</span>
                        <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                        <span className="text-[10px] text-gray-400">{new Date(t.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })} · {(t.created_by_email ?? '').split('@')[0]}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => startEdit(t)} className="text-xs text-gray-500 hover:text-amber-600 px-2">Edytuj</button>
                        {isAdmin && (
                          <button onClick={() => deleteTicket(t.id)} className="rounded p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                        )}
                      </div>
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-gray-900">{t.title}</h3>
                    {t.description && <p className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">{t.description}</p>}
                    {t.status !== 'zakonczone' && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {t.status === 'otwarte' && (
                          <button onClick={() => updateStatus(t.id, 'w_trakcie')}
                            className="rounded bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-600 hover:bg-blue-100">→ W trakcie</button>
                        )}
                        <button onClick={() => updateStatus(t.id, 'zakonczone')}
                          className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-600 hover:bg-emerald-100">
                          <CheckCircle2 className="h-3 w-3" /> Zakończ
                        </button>
                        <button onClick={() => toggleComments(t.id)}
                          className="flex items-center gap-1 rounded bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-100">
                          <MessageSquare className="h-3 w-3" /> Komentarze ({cCount})
                        </button>
                      </div>
                    )}
                    {t.status === 'zakonczone' && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <button onClick={() => updateStatus(t.id, 'otwarte')}
                          className="rounded bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-100">↻ Otwórz ponownie</button>
                        <button onClick={() => toggleComments(t.id)}
                          className="flex items-center gap-1 rounded bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-100">
                          <MessageSquare className="h-3 w-3" /> Komentarze ({cCount})
                        </button>
                      </div>
                    )}

                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        {comments.length === 0 && (
                          <p className="text-xs text-gray-400">Brak komentarzy</p>
                        )}
                        {comments.map(c => (
                          <div key={c.id} className="rounded bg-gray-50 p-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-[10px] text-gray-500">
                                <span className="font-medium text-gray-700">{(c.created_by_email ?? '').split('@')[0] || 'system'}</span>
                                <span className="ml-2">{new Date(c.created_at).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              {isAdmin && (
                                <button onClick={() => deleteComment(c.id, t.id)} className="rounded p-1 text-gray-300 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                              )}
                            </div>
                            {c.text && <p className="mt-1 text-xs text-gray-700 whitespace-pre-wrap">{c.text}</p>}
                            {c.photo_url && (
                              <a href={c.photo_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                                <img src={c.photo_url} alt="załącznik" className="max-h-48 rounded border border-gray-200" />
                              </a>
                            )}
                          </div>
                        ))}

                        {/* Add comment form */}
                        <div className="rounded border border-gray-200 bg-white p-2 space-y-2">
                          <textarea
                            value={draft}
                            onChange={(e) => setCommentDrafts(prev => ({ ...prev, [t.id]: e.target.value }))}
                            placeholder="Dodaj komentarz..."
                            rows={2}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-amber-500"
                          />
                          {photo && (
                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                              <span className="truncate max-w-xs">📎 {photo.name}</span>
                              <button onClick={() => setCommentPhotos(prev => ({ ...prev, [t.id]: null }))} className="text-red-500 hover:underline">usuń</button>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-amber-600 cursor-pointer">
                              <ImagePlus className="h-3 w-3" />
                              <span>{photo ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => setCommentPhotos(prev => ({ ...prev, [t.id]: e.target.files?.[0] ?? null }))}
                              />
                            </label>
                            <button
                              onClick={() => addComment(t.id)}
                              disabled={(!draft.trim() && !photo) || submittingComment === t.id}
                              className="flex items-center gap-1 rounded bg-amber-500 px-3 py-1 text-[10px] font-medium text-white hover:bg-amber-400 disabled:opacity-30"
                            >
                              <Send className="h-3 w-3" />
                              {submittingComment === t.id ? 'Wysyłam...' : 'Wyślij'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
