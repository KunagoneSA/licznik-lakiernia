import type { PaintingVariant } from '../types/database'

// Dane firmy w nagłówku cennika (te same co na proformach w kuna-erp)
const FIRMA = {
  nazwa: 'Kunagone - lakiernia i renowacja mebli',
  adres: 'Pl. Kilińskiego 1, 32-660 Chełmek',
  nip: 'NIP: 549-244-92-85',
  tel: 'tel. +48 882-905-145',
  email: 'info@kunagone.pl',
  www: 'www.kunagone.pl',
}

const AMBER = '#d97706'
const GRAY = '#6b7280'
const LIGHT = '#f9fafb'
const BORDER = '#e5e7eb'

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}logo-kunagone.png`)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export function buildCennikDd(variants: PaintingVariant[], logo: string | null) {
  // Parowanie wariantów głównych z ich odpowiednikami "(+ MDF)" — ta sama logika co w CennikPage
  const mdfVariants = new Map(
    variants
      .filter((v) => v.name.includes('(+ MDF)'))
      .map((v) => [v.name.replace(' (+ MDF)', ''), v])
  )
  const mainVariants = variants.filter((v) => !v.name.includes('(+ MDF)'))
  const hasMdf = mdfVariants.size > 0

  const headerRow = [
    { text: 'WARIANT', style: 'th' },
    { text: 'CENA / m²', style: 'th', alignment: 'right' as const },
    ...(hasMdf ? [{ text: '+ MDF', style: 'th', alignment: 'right' as const }] : []),
    { text: 'STRONY', style: 'th', alignment: 'center' as const },
  ]

  const rows = mainVariants.map((v, i) => {
    const mdfV = mdfVariants.get(v.name)
    const fill = i % 2 === 1 ? LIGHT : undefined
    return [
      { text: v.name, fillColor: fill },
      { text: `${v.default_price_per_m2} zł`, alignment: 'right' as const, bold: true, color: AMBER, fillColor: fill },
      ...(hasMdf
        ? [{ text: mdfV ? `${mdfV.default_price_per_m2} zł` : '', alignment: 'right' as const, bold: true, color: AMBER, fillColor: fill }]
        : []),
      { text: String(v.sides), alignment: 'center' as const, color: GRAY, fillColor: fill },
    ]
  })

  const dzis = new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })

  const dd = {
    pageSize: 'A4' as const,
    pageMargins: [40, 36, 40, 50] as [number, number, number, number],
    content: [
      {
        columns: [
          logo ? { image: logo, fit: [65, 65] as [number, number], width: 75 } : { text: 'KUNAGONE', fontSize: 22, bold: true, width: 90 },
          {
            width: '*',
            alignment: 'right' as const,
            stack: [
              { text: FIRMA.nazwa, bold: true, fontSize: 10 },
              { text: FIRMA.adres, fontSize: 9, color: GRAY },
              { text: FIRMA.nip, fontSize: 9, color: GRAY },
              { text: `${FIRMA.tel}  ·  ${FIRMA.email}`, fontSize: 9, color: GRAY },
              { text: FIRMA.www, fontSize: 9, color: AMBER },
            ],
          },
        ],
        columnGap: 20,
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: AMBER }], margin: [0, 14, 0, 18] as [number, number, number, number] },
      { text: 'Cennik usług lakierowania formatek', fontSize: 14, bold: true, margin: [0, 0, 0, 2] as [number, number, number, number] },
      { text: `Obowiązuje od: ${dzis}`, fontSize: 8, color: GRAY, margin: [0, 0, 0, 10] as [number, number, number, number] },
      {
        table: {
          headerRows: 1,
          widths: hasMdf ? ['*', 65, 65, 45] : ['*', 75, 50],
          body: [headerRow, ...rows],
        },
        layout: {
          hLineWidth: (i: number, node: { table: { body: unknown[] } }) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
          vLineWidth: () => 0,
          hLineColor: (i: number) => (i === 1 ? AMBER : BORDER),
          paddingTop: () => 3.5,
          paddingBottom: () => 3.5,
          paddingLeft: () => 6,
          paddingRight: () => 6,
        },
        fontSize: 9,
      },
      { text: 'Podane ceny są cenami netto w PLN za m². Do cen należy doliczyć podatek VAT.', fontSize: 8, color: GRAY, margin: [0, 12, 0, 0] as [number, number, number, number] },
      { text: 'Cennik nie stanowi oferty handlowej w rozumieniu art. 66 Kodeksu cywilnego.', fontSize: 8, color: GRAY, margin: [0, 2, 0, 0] as [number, number, number, number] },
    ],
    footer: {
      columns: [
        { text: `${FIRMA.nazwa}  ·  ${FIRMA.adres}  ·  ${FIRMA.tel}  ·  ${FIRMA.email}`, alignment: 'center' as const, fontSize: 8, color: GRAY },
      ],
      margin: [40, 15, 40, 0] as [number, number, number, number],
    },
    styles: {
      th: { fontSize: 8, bold: true, color: GRAY },
    },
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    info: { title: 'Cennik usług lakierowania formatek - Kunagone' },
  }

  return dd
}

export async function generateCennikPdf(variants: PaintingVariant[]) {
  // pdfmake ładowany dopiero przy kliknięciu, żeby nie obciążać startu aplikacji
  const [pdfMakeModule, vfsModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  const pdfMake = pdfMakeModule.default ?? pdfMakeModule
  pdfMake.addVirtualFileSystem(vfsModule.default ?? vfsModule)

  const logo = await loadLogoDataUrl()
  const dd = buildCennikDd(variants, logo)

  const nazwaPliku = `Cennik lakierowania Kunagone ${new Date().toISOString().slice(0, 10)}.pdf`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfMake.createPdf(dd as any).download(nazwaPliku)
}
