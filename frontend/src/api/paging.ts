import { MAX_PAGE_SIZE } from '@/types/api'
import type { PageParams, PagedResult } from '@/types/api'

export function pageQuery(params: PageParams | undefined, into = new URLSearchParams()) {
  if (params?.page) into.set('page', String(params.page))
  if (params?.pageSize) into.set('pageSize', String(params.pageSize))
  return into
}

export function withQuery(path: string, params: URLSearchParams) {
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

/**
 * Walks every page of a list endpoint.
 *
 * For the select dropdowns, which need all the options rather than the first page —
 * showing 25 of 60 facilities with no hint that the rest exist is worse than a slower
 * load. Guarded by a page ceiling so a runaway count cannot spin forever.
 */
export async function fetchAllPages<T>(
  fetchPage: (params: PageParams) => Promise<PagedResult<T>>,
  maxPages = 20,
): Promise<T[]> {
  const first = await fetchPage({ page: 1, pageSize: MAX_PAGE_SIZE })
  const items = [...first.items]

  const lastPage = Math.min(first.totalPages, maxPages)
  for (let page = 2; page <= lastPage; page++) {
    const next = await fetchPage({ page, pageSize: MAX_PAGE_SIZE })
    items.push(...next.items)
  }

  return items
}
