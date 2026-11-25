// Supabase (PostgREST) devuelve como máximo ~1000 filas por consulta, aunque pidas
// `.limit(50000)`. Estas utilidades traen TODO paginando con `.range()`.

const PAGE_SIZE = 1000

/**
 * @param {(from:number, to:number) => PromiseLike<{data:any[], error:any}>} fetchPage
 *   Debe construir la consulta (con un `.order()` estable) y aplicar `.range(from, to)`.
 */
export const fetchAllRows = async (fetchPage) => {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const page = data || []
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}

// Para filtros `.in(col, ids)` con muchos ids (la URL tiene límite de largo).
export const chunk = (list, size = 150) => {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}
