import { useState } from 'react'
import { Undo2, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

// Zakupy lakierni wpisywane w Zaopatrzeniu kuna-erp (kategoria „lakiernia"), czytane wprost z tej samej bazy.
// Zwrot (Anna cb3e6f9f, 01.10.2026): „przycisk »zwrócono«, po jego naciśnięciu przekreślasz pozycję (nie usuwasz)
// i odliczasz automatycznie ten koszt; daj możliwość edycji, bo mogę kupić 3 puszki bejcy, a zwrócić tylko 1".
// Zwrot zapisujemy przy samej pozycji w erp_supplies, więc liczy się wszędzie: tu, w Finansach i w kaflu ERP.
// Zmiana (Anna 8ccce21a, 08.10.2026): bez liczenia sztuk, tylko całość albo część. Proporcja kosztu „nie będzie
// dawać wiarygodnych danych". Całość = koszt towaru się nie liczy; część = oznaczenie, koszt bez zmian.

export interface ZakupErp {
  id: string
  numer: string | null
  data: string | null
  opis: string | null
  zamowienie: string | null
  dostawca: string | null
  ilosc: number | null
  koszt: number | null           // wartość CAŁEJ pozycji netto
  koszt_dostawy: number | null
  waluta: string | null
  zwrocono_ilosc: number | null
  zwrot_notatka: string | null
  zwrot_at: string | null
  zalaczniki?: { url: string; name?: string }[] | null   // faktura (PDF albo zdjęcie) wgrana w ERP (Anna 34ff4632)
}
export const POLA_ZAKUPU_ERP = 'id, numer, data, opis, zamowienie, dostawca, ilosc, koszt, koszt_dostawy, waluta, zwrocono_ilosc, zwrot_notatka, zwrot_at, zalaczniki'

/** Ilość pozycji. Pozycja bez ilości liczy się jako 1 sztuka. */
const iloscPozycji = (z: ZakupErp) => (Number(z.ilosc) > 0 ? Number(z.ilosc) : 1)
/** Zwrot w bazie (ta sama reguła co Zaopatrzenie w ERP): zwrot_at = był zwrot; zwrocono_ilosc >= ilości = całość, inaczej część. */
const rodzajZwrotu = (z: ZakupErp): 'calosc' | 'czesc' | null =>
  !z.zwrot_at ? null : (Number(z.zwrocono_ilosc) || 0) >= iloscPozycji(z) ? 'calosc' : 'czesc'

/** Koszt po zwrocie: zwrot całości = sama wysyłka; zwrot części = bez zmian (wysyłki nikt nie oddaje). */
export function kosztZakupuErp(z: ZakupErp): number {
  return (rodzajZwrotu(z) === 'calosc' ? 0 : (Number(z.koszt) || 0)) + (Number(z.koszt_dostawy) || 0)
}
export const tylkoPln = (z: ZakupErp) => (z.waluta || 'PLN') === 'PLN'

const fmt = (n: number) => n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function ZakupyZaopatrzenia({ zakupy, onZmiana, dopisek }: { zakupy: ZakupErp[]; onZmiana: () => void; dopisek: string }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [edytowany, setEdytowany] = useState<string | null>(null)
  const [rodzaj, setRodzaj] = useState<'calosc' | 'czesc'>('calosc')
  const [notatka, setNotatka] = useState('')
  const [zapisuje, setZapisuje] = useState(false)

  const otworz = (z: ZakupErp) => {
    setEdytowany(z.id)
    setRodzaj(rodzajZwrotu(z) ?? 'calosc')
    setNotatka(z.zwrot_notatka ?? '')
  }
  const zapisz = async (z: ZakupErp, cofnij = false) => {
    // Całość = cała ilość pozycji; część = bez liczenia sztuk (ERP może dopisać sztuki zdjęte ze stanu).
    const wartosc = cofnij ? null : rodzaj === 'calosc' ? iloscPozycji(z) : null
    setZapisuje(true)
    const { data, error } = await supabase.from('erp_supplies').update({
      zwrocono_ilosc: wartosc,
      zwrot_notatka: cofnij ? null : (notatka.trim() || null),
      zwrot_at: cofnij ? null : new Date().toISOString(),
      zwrot_przez: cofnij ? null : (user?.email ?? null),
    }).eq('id', z.id).select('id')
    setZapisuje(false)
    // Brak zwróconego wiersza = zapis nie przeszedł (np. uprawnienia), choć błędu nie było.
    if (error || !data?.length) { toast('Nie zapisano zwrotu' + (error ? `: ${error.message}` : ''), 'error'); return }
    toast(cofnij ? 'Zwrot cofnięty' : rodzaj === 'calosc' ? 'Zwrot całości zapisany, koszt odliczony' : 'Zwrot części zapisany')
    setEdytowany(null)
    onZmiana()
  }

  if (!zakupy.length) return null
  const razem = zakupy.filter(tylkoPln).reduce((s, z) => s + kosztZakupuErp(z), 0)

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="bg-gray-50 px-3 py-1.5 flex items-center justify-between border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Zakupy z Zaopatrzenia (ERP)</span>
        <span className="text-[10px] text-gray-400">{dopisek}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            <th className="px-3 py-1.5 text-left font-medium text-gray-500">Data</th>
            <th className="px-3 py-1.5 text-left font-medium text-gray-500">Nr</th>
            <th className="px-3 py-1.5 text-left font-medium text-gray-500">Co</th>
            <th className="px-3 py-1.5 text-left font-medium text-gray-500">Dostawca</th>
            <th className="px-3 py-1.5 text-right font-medium text-gray-500">Kwota netto</th>
            <th className="px-2 py-1.5 print:hidden"></th>
          </tr>
        </thead>
        <tbody>
          {zakupy.map((z, i) => {
            const obca = !tylkoPln(z)
            const rz = rodzajZwrotu(z)
            const calyZwrot = rz === 'calosc'
            return (
              <tr key={z.id} className={`border-b border-gray-50 align-top ${i % 2 === 1 ? 'bg-gray-50/30' : ''} ${obca ? 'opacity-50' : ''}`}>
                <td className="px-3 py-1 text-gray-600">{z.data}</td>
                <td className="px-3 py-1 text-gray-500">{z.numer || '—'}</td>
                <td className="px-3 py-1 text-gray-800">
                  <span className={calyZwrot ? 'line-through text-gray-400' : ''}>{z.opis || z.zamowienie || '—'}</span>
                  {(z.zalaczniki ?? []).map((a, k) => (
                    <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" title={a.name || 'Faktura'}
                      className="ml-1.5 text-[10px] font-semibold text-amber-600 hover:underline">
                      📎 {/\.pdf($|\?)/i.test(a.url) ? 'PDF' : 'foto'}{(z.zalaczniki ?? []).length > 1 ? ` ${k + 1}` : ''}
                    </a>
                  ))}
                  {Number(z.ilosc) > 0 && <span className="ml-1 text-[10px] text-gray-400">({z.ilosc} szt.)</span>}
                  {rz && (
                    <div className="text-[10px] font-medium text-rose-600">
                      {calyZwrot ? 'Zwrócono całość' : 'Zwrócono część'}
                      {z.zwrot_notatka && <span className="font-normal text-gray-500"> · {z.zwrot_notatka}</span>}
                    </div>
                  )}
                  {edytowany === z.id && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 print:hidden">
                      <span className="text-[10px] text-gray-500">Zwrócono</span>
                      {(['calosc', 'czesc'] as const).map((v) => (
                        <button key={v} type="button" onClick={() => setRodzaj(v)}
                          className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${rodzaj === v ? 'border-rose-500 bg-rose-500 text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-rose-50'}`}>
                          {v === 'calosc' ? 'całość' : 'część'}
                        </button>
                      ))}
                      <input value={notatka} onChange={(e) => setNotatka(e.target.value)} placeholder="powód, np. uszkodzona puszka"
                        className="min-w-[140px] flex-1 rounded border border-gray-300 px-1.5 py-0.5 text-[11px]" />
                      <button type="button" disabled={zapisuje} onClick={() => void zapisz(z)}
                        className="rounded bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-amber-600 disabled:opacity-50">Zapisz</button>
                      {rz && (
                        <button type="button" disabled={zapisuje} onClick={() => void zapisz(z, true)}
                          className="rounded px-2 py-0.5 text-[11px] text-gray-500 hover:bg-gray-100">Cofnij zwrot</button>
                      )}
                      <button type="button" onClick={() => setEdytowany(null)} className="rounded px-2 py-0.5 text-[11px] text-gray-400 hover:bg-gray-100">Anuluj</button>
                    </div>
                  )}
                </td>
                <td className="px-3 py-1 text-gray-600">{z.dostawca || '—'}</td>
                <td className="px-3 py-1 text-right tabular-nums">
                  <span className={calyZwrot ? 'text-gray-400' : 'text-orange-600'}>{fmt(kosztZakupuErp(z))} {obca ? z.waluta : 'zł'}</span>
                  {calyZwrot && !!Number(z.koszt) && <div className="text-[10px] text-gray-400 line-through">{fmt((Number(z.koszt) || 0) + (Number(z.koszt_dostawy) || 0))} zł</div>}
                  {!!Number(z.koszt_dostawy) && <div className="text-[10px] text-gray-400">w tym wysyłka {fmt(Number(z.koszt_dostawy))}</div>}
                  {obca && <div className="text-[10px] text-gray-400">nie wliczone — inna waluta</div>}
                </td>
                <td className="px-2 py-1 text-right print:hidden">
                  <button type="button" onClick={() => (edytowany === z.id ? setEdytowany(null) : otworz(z))}
                    title={rz ? 'Popraw zwrot' : 'Zwrot (całość albo część)'}
                    className="inline-flex items-center gap-1 rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500 hover:bg-gray-50 hover:text-rose-600">
                    {rz ? <Pencil className="h-3 w-3" /> : <Undo2 className="h-3 w-3" />}
                    {rz ? 'Zwrot' : 'Zwrócono'}
                  </button>
                </td>
              </tr>
            )
          })}
          <tr className="bg-gray-50 font-semibold border-t border-gray-200">
            <td className="px-3 py-1.5 text-gray-700" colSpan={4}>Razem (po zwrotach)</td>
            <td className="px-3 py-1.5 text-right text-orange-600 tabular-nums">{fmt(razem)} zł</td>
            <td className="print:hidden"></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
