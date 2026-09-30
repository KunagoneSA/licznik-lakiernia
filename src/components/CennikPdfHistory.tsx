import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface LogEntry {
  id: string
  created_at: string
  client_name: string | null
  generated_by: string | null
}

/**
 * Historia generowań cennika PDF (tabela cennik_pdf_log).
 * clientId = null → cennik ogólny; refreshToken podbijany po każdym wygenerowaniu odświeża listę.
 */
export default function CennikPdfHistory({ clientId, refreshToken }: { clientId: string | null; refreshToken: number }) {
  const [entries, setEntries] = useState<LogEntry[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      let query = supabase
        .from('cennik_pdf_log')
        .select('id, created_at, client_name, generated_by')
        .order('created_at', { ascending: false })
        .limit(5)
      query = clientId === null ? query.is('client_id', null) : query.eq('client_id', clientId)
      const { data } = await query
      if (!cancelled) setEntries((data as LogEntry[]) ?? [])
    }
    load()
    return () => { cancelled = true }
  }, [clientId, refreshToken])

  if (entries.length === 0) return null

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-1.5 mb-1">
        <History className="h-3 w-3 text-gray-400" />
        <span className="text-[10px] font-medium text-gray-400 uppercase">Historia generowań PDF</span>
      </div>
      <ul className="space-y-0.5">
        {entries.map((e) => (
          <li key={e.id} className="text-[11px] text-gray-500">
            {new Date(e.created_at).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {e.generated_by && <span className="text-gray-400"> · {e.generated_by}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
