// Utilidades puras para convertir productos <-> CSV (compatible con Excel en español).
// - Export: separador `;`, decimales con coma y BOM UTF-8 (Excel lo abre sin romper tildes).
// - Import: autodetecta `;` o `,` y acepta decimales con punto o coma.

export const CSV_COLUMNS = [
  'nombre',
  'descripcion',
  'categoria',
  'precio_usdt',
  'profit_porcentaje',
  'precio_fijo',
  'visible',
  'destacado',
  'imagen_1',
  'imagen_2',
  'imagen_3',
]

const DELIMITER = ';'
const BOM = '\uFEFF'

// Evita que Excel interprete textos como fórmulas (CSV injection).
const FORMULA_START = /^[=+\-@]/

const escapeCell = (value) => {
  let text = value == null ? '' : String(value)
  if (FORMULA_START.test(text) && !/^-?\d+([.,]\d+)?$/.test(text)) text = `'${text}`
  if (/[";\n\r,]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

const unescapeFormulaGuard = (text) => (/^'[=+\-@]/.test(text) ? text.slice(1) : text)

export const formatDecimal = (n) => String(Number(n) || 0).replace('.', ',')

export const parseDecimal = (raw) => {
  const text = String(raw ?? '').trim().replace(/\s/g, '').replace(/[$]/g, '')
  if (!text) return null

  const lastComma = text.lastIndexOf(',')
  const lastDot = text.lastIndexOf('.')
  let normalized = text
  if (lastComma > -1 && lastDot > -1) {
    // El último separador es el decimal; el otro es de miles.
    normalized = lastComma > lastDot
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(/,/g, '')
  } else if (lastComma > -1) {
    normalized = text.replace(',', '.')
  }

  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

const TRUE_VALUES = new Set(['si', 'sí', 's', 'true', '1', 'yes', 'y', 'x'])
const FALSE_VALUES = new Set(['no', 'n', 'false', '0', ''])

export const parseBool = (raw, fallback) => {
  const text = String(raw ?? '').trim().toLowerCase()
  if (TRUE_VALUES.has(text)) return true
  if (FALSE_VALUES.has(text)) return text === '' ? fallback : false
  return fallback
}

export const boolToCell = (value) => (value ? 'si' : 'no')

export const toCsv = (rows) => {
  const lines = [CSV_COLUMNS.join(DELIMITER)]
  for (const row of rows) {
    lines.push(CSV_COLUMNS.map((col) => escapeCell(row[col])).join(DELIMITER))
  }
  return BOM + lines.join('\r\n') + '\r\n'
}

const detectDelimiter = (firstLine) => {
  const semicolons = (firstLine.match(/;/g) || []).length
  const commas = (firstLine.match(/,/g) || []).length
  const tabs = (firstLine.match(/\t/g) || []).length
  if (tabs > semicolons && tabs > commas) return '\t'
  return semicolons >= commas ? ';' : ','
}

// Parser CSV (RFC 4180) con soporte de comillas y saltos de línea dentro de celdas.
export const parseCsv = (input) => {
  const text = String(input ?? '').replace(/^\uFEFF/, '')
  const firstLine = text.split(/\r?\n/, 1)[0] || ''
  const delimiter = detectDelimiter(firstLine)

  const records = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
      continue
    }

    if (ch === '"') inQuotes = true
    else if (ch === delimiter) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      row.push(cell)
      records.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell)
    records.push(row)
  }

  const nonEmpty = records.filter((r) => r.some((c) => String(c).trim() !== ''))
  if (nonEmpty.length === 0) return []

  const header = nonEmpty[0].map((h) => String(h).trim().toLowerCase())
  return nonEmpty.slice(1).map((r) => {
    const obj = {}
    header.forEach((h, idx) => {
      if (h) obj[h] = unescapeFormulaGuard(String(r[idx] ?? '').trim())
    })
    return obj
  })
}
