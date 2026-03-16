/** RAL Classic colors → HEX mapping */
const RAL: Record<string, string> = {
  '1000': '#BEBD7F', '1001': '#C2B078', '1002': '#C6A961', '1003': '#E5BE01',
  '1004': '#CDA434', '1005': '#A98307', '1006': '#E4A010', '1007': '#DC9D00',
  '1011': '#8A6642', '1012': '#C7B446', '1013': '#EAE6CA', '1014': '#E1CC4F',
  '1015': '#E6D690', '1016': '#EDFF21', '1017': '#F5D033', '1018': '#F8F32B',
  '1019': '#9E9764', '1020': '#999950', '1021': '#F3DA0B', '1023': '#FAD201',
  '1024': '#AEA04B', '1026': '#FFFF00', '1027': '#9D9101', '1028': '#F4A900',
  '1032': '#D6AE01', '1033': '#F3A505', '1034': '#EFA94A', '1035': '#6A5D4D',
  '1036': '#705335', '1037': '#F39F18',
  '2000': '#ED760E', '2001': '#C93C20', '2002': '#CB2821', '2003': '#FF7514',
  '2004': '#F44611', '2005': '#FF2301', '2007': '#FFA420', '2008': '#F75E25',
  '2009': '#F54021', '2010': '#D36E08', '2011': '#EC7C26', '2012': '#E55137',
  '2013': '#C35831',
  '3000': '#AF2B1E', '3001': '#A52019', '3002': '#A2231D', '3003': '#9B111E',
  '3004': '#75151E', '3005': '#5E2129', '3007': '#412227', '3009': '#642424',
  '3011': '#781F19', '3012': '#C1876B', '3013': '#A12312', '3014': '#D36E70',
  '3015': '#EA899A', '3016': '#B32821', '3017': '#E63244', '3018': '#D53032',
  '3020': '#CC0605', '3022': '#D95030', '3024': '#F80000', '3026': '#FE0000',
  '3027': '#C51D34', '3028': '#CB3234', '3031': '#B32428', '3032': '#721422',
  '3033': '#B44C43',
  '4001': '#6D3461', '4002': '#922B3E', '4003': '#DE4C8A', '4004': '#641C34',
  '4005': '#6C4675', '4006': '#A03472', '4007': '#4A192C', '4008': '#924E7D',
  '4009': '#A18594', '4010': '#CF3476', '4011': '#8673A1', '4012': '#6C6874',
  '5000': '#354D73', '5001': '#1F3438', '5002': '#20214F', '5003': '#1D1E33',
  '5004': '#18171C', '5005': '#1E2460', '5007': '#3E5F8A', '5008': '#26252D',
  '5009': '#025669', '5010': '#0E294B', '5011': '#231A24', '5012': '#3B83BD',
  '5013': '#1E213D', '5014': '#606E8C', '5015': '#2271B3', '5017': '#063971',
  '5018': '#3F888F', '5019': '#1B5583', '5020': '#1D334A', '5021': '#256D7B',
  '5022': '#252850', '5023': '#49678D', '5024': '#5D9B9B', '5025': '#2A6478',
  '5026': '#102C54',
  '6000': '#316650', '6001': '#287233', '6002': '#2D572C', '6003': '#424632',
  '6004': '#1F3A3D', '6005': '#2F4538', '6006': '#3E3B32', '6007': '#343B29',
  '6008': '#39352A', '6009': '#31372B', '6010': '#35682D', '6011': '#587246',
  '6012': '#343E40', '6013': '#6C7156', '6014': '#47402E', '6015': '#3B3C36',
  '6016': '#1E5945', '6017': '#4C9141', '6018': '#57A639', '6019': '#BDECB6',
  '6020': '#2E3A23', '6021': '#89AC76', '6022': '#25221B', '6024': '#308446',
  '6025': '#3D642D', '6026': '#015D52', '6027': '#84C3BE', '6028': '#2C5545',
  '6029': '#20603D', '6032': '#317F43', '6033': '#497E76', '6034': '#7FB5B5',
  '6035': '#1C542D', '6036': '#193737', '6037': '#008F39', '6038': '#00BB2D',
  '7000': '#78858B', '7001': '#8A9597', '7002': '#7E7B52', '7003': '#6C7059',
  '7004': '#969992', '7005': '#646B63', '7006': '#6D6552', '7008': '#6A5F31',
  '7009': '#4D5645', '7010': '#4C514A', '7011': '#434B4D', '7012': '#4E5754',
  '7013': '#464531', '7015': '#434750', '7016': '#293133', '7021': '#23282B',
  '7022': '#332F2C', '7023': '#686C5E', '7024': '#474A51', '7026': '#2F353B',
  '7030': '#8B8C7A', '7031': '#474B4E', '7032': '#B8B799', '7033': '#7D8471',
  '7034': '#8F8B66', '7035': '#D7D7D7', '7036': '#7F7679', '7037': '#7D7F7D',
  '7038': '#B5B8B1', '7039': '#6C6960', '7040': '#9DA1AA', '7042': '#8D948D',
  '7043': '#4E5452', '7044': '#CAC4B0', '7045': '#909090', '7046': '#82898F',
  '7047': '#D0D0D0', '7048': '#898176',
  '8000': '#826C34', '8001': '#955F20', '8002': '#6C3B2A', '8003': '#734222',
  '8004': '#8E402A', '8007': '#59351F', '8008': '#6F4F28', '8011': '#5B3A29',
  '8012': '#592321', '8014': '#382C1E', '8015': '#633A34', '8016': '#4C2F27',
  '8017': '#45322E', '8019': '#403A3A', '8022': '#212121', '8023': '#A65E2E',
  '8024': '#79553D', '8025': '#755C48', '8028': '#4E3B31', '8029': '#763C28',
  '9001': '#FDF4E3', '9002': '#E7EBDA', '9003': '#F4F4F4', '9004': '#282828',
  '9005': '#0A0A0A', '9006': '#A5A5A5', '9007': '#8F8F8F', '9010': '#FFFFFF',
  '9011': '#1C1C1C', '9016': '#F6F6F6', '9017': '#1A1A1A', '9018': '#D7D7D7',
  '9022': '#9C9C9C', '9023': '#828282',
}

/**
 * Extract RAL number from color string and return HEX.
 * Handles: "RAL 9016", "RAL9016", "RAL 9016 MAT", "ral 9016 połysk", etc.
 */
export function ralToHex(colorStr: string | null | undefined): string | null {
  if (!colorStr) return null
  const m = colorStr.match(/RAL\s*(\d{4})/i)
  if (!m) return null
  return RAL[m[1]] ?? null
}

/**
 * Approximate NCS (Natural Color System) to HEX conversion.
 * Format: "NCS S 1050-Y90R", "S 2030-B", "NCS S 0500-N", etc.
 */
export function ncsToHex(colorStr: string | null | undefined): string | null {
  if (!colorStr) return null
  // Match many NCS formats:
  // "NCS S 1050-Y90R", "S 1050-Y90R", "NCS S1050-Y90R", "NCS 1050-Y90R",
  // "S1050-Y90R", "NCS S 1502 R", "NCS S 1502-R", "S 0500-N"
  const m = colorStr.match(/(?:NCS\s*)?S?\s*(\d{2})(\d{2})\s*[-\s]\s*(N|[YRBG]\d{0,2}[YRBG]?)/i)
  if (!m) return null

  const blackness = parseInt(m[1]) / 100 // 0..0.99
  const chromaticness = parseInt(m[2]) / 100 // 0..0.99
  const huePart = m[3].toUpperCase()

  // Neutral (gray)
  if (huePart === 'N') {
    const gray = Math.round(255 * (1 - blackness))
    return rgbToHex(gray, gray, gray)
  }

  // Parse hue into angle on color circle: Y=0, R=90, B=180, G=270
  const hueAngle = parseNcsHue(huePart)
  if (hueAngle === null) return null

  // Convert NCS to approximate RGB
  // 1. Get the full-chroma color at this hue
  const [hr, hg, hb] = hueToRgb(hueAngle)

  // 2. Mix with white based on chromaticness (low chroma = more white)
  const wr = hr + (255 - hr) * (1 - chromaticness)
  const wg = hg + (255 - hg) * (1 - chromaticness)
  const wb = hb + (255 - hb) * (1 - chromaticness)

  // 3. Apply blackness (darken)
  const r = Math.round(wr * (1 - blackness))
  const g = Math.round(wg * (1 - blackness))
  const b = Math.round(wb * (1 - blackness))

  return rgbToHex(
    Math.max(0, Math.min(255, r)),
    Math.max(0, Math.min(255, g)),
    Math.max(0, Math.min(255, b))
  )
}

function parseNcsHue(hue: string): number | null {
  // NCS hue circle: Y(0°) → R(90°) → B(180°) → G(270°) → Y(360°)
  const bases: Record<string, number> = { Y: 0, R: 90, B: 180, G: 270 }

  // Simple hue: "Y", "R", "B", "G"
  if (hue.length === 1 && bases[hue] !== undefined) return bases[hue]

  // Compound hue: "Y90R" = 90% from Y towards R = 0 + 90*0.9 = 81°
  // "R50B" = 50% from R towards B = 90 + 90*0.5 = 135°
  const cm = hue.match(/^([YRBG])(\d{2})([YRBG])$/)
  if (!cm) return null

  const from = bases[cm[1]]
  const pct = parseInt(cm[2]) / 100
  const to = bases[cm[3]]

  if (from === undefined || to === undefined) return null

  // Calculate angle (handle wrap-around G→Y)
  let diff = to - from
  if (diff < 0) diff += 360

  return (from + diff * pct) % 360
}

function hueToRgb(angle: number): [number, number, number] {
  // Map NCS hue angle to RGB
  // Y(0°)=[255,210,0], R(90°)=[200,0,0], B(180°)=[0,80,180], G(270°)=[0,150,60]
  const stops: [number, number, number, number][] = [
    [0,   255, 210, 0],    // Yellow
    [90,  200, 0,   0],    // Red
    [180, 0,   80,  180],  // Blue
    [270, 0,   150, 60],   // Green
    [360, 255, 210, 0],    // Yellow (wrap)
  ]

  for (let i = 0; i < stops.length - 1; i++) {
    if (angle >= stops[i][0] && angle <= stops[i + 1][0]) {
      const t = (angle - stops[i][0]) / (stops[i + 1][0] - stops[i][0])
      return [
        Math.round(stops[i][1] + (stops[i + 1][1] - stops[i][1]) * t),
        Math.round(stops[i][2] + (stops[i + 1][2] - stops[i][2]) * t),
        Math.round(stops[i][3] + (stops[i + 1][3] - stops[i][3]) * t),
      ]
    }
  }
  return [255, 210, 0]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}

/** Common Polish/English color keywords → HEX */
const KEYWORDS: Record<string, string> = {
  biały: '#FFFFFF', bialy: '#FFFFFF', white: '#FFFFFF',
  czarny: '#0A0A0A', black: '#0A0A0A',
  czerwony: '#CC0605', red: '#CC0605',
  niebieski: '#2271B3', blue: '#2271B3',
  zielony: '#287233', green: '#287233',
  żółty: '#E5BE01', zolty: '#E5BE01', yellow: '#E5BE01',
  szary: '#909090', grey: '#909090', gray: '#909090',
  brązowy: '#6C3B2A', brazowy: '#6C3B2A', brown: '#6C3B2A',
  pomarańczowy: '#ED760E', pomaranczowy: '#ED760E', orange: '#ED760E',
  fioletowy: '#6D3461', violet: '#6D3461', purple: '#6D3461',
  różowy: '#EA899A', rozowy: '#EA899A', pink: '#EA899A',
  beżowy: '#C2B078', bezowy: '#C2B078', beige: '#C2B078',
  kremowy: '#EAE6CA', cream: '#EAE6CA',
  grafitowy: '#293133', graphite: '#293133',
  antracyt: '#293133', anthracite: '#293133',
  srebrny: '#A5A5A5', silver: '#A5A5A5',
  złoty: '#CDA434', zloty: '#CDA434', gold: '#CDA434',
}

function keywordToHex(colorStr: string | null | undefined): string | null {
  if (!colorStr) return null
  const lower = colorStr.toLowerCase().trim()
  for (const [keyword, hex] of Object.entries(KEYWORDS)) {
    if (lower.includes(keyword)) return hex
  }
  return null
}

/**
 * Get HEX color from any color string (RAL, NCS, or keyword)
 */
export function getColorHex(colorStr: string | null | undefined): string | null {
  return ralToHex(colorStr) ?? ncsToHex(colorStr) ?? keywordToHex(colorStr)
}
