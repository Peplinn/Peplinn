import type { Page } from 'astro'

/**
 * Astro's `paginate()` helper is only available inside `getStaticPaths`, which
 * on-demand routes don't have. This builds the same `Page` shape from the
 * `[...page]` rest param so the existing templates and `<Paginator />` keep
 * working unchanged.
 *
 * Page 1 always lives at `baseUrl` itself. Later pages sit at `baseUrl/N`, or at
 * `baseUrl/<pageSegment>/N` when a segment is given - needed where a sibling route
 * already claims single segments under `baseUrl` (e.g. `/writing/<slug>`).
 *
 * Returns `null` when the requested page doesn't exist, so the caller can 404.
 */
export function paginate<T>(
  items: T[],
  options: { pageParam?: string; baseUrl: string; pageSize?: number; pageSegment?: string }
): Page<T> | null {
  // 10 matches the default Astro's own `paginate()` applies.
  const { pageParam, baseUrl, pageSize = 10, pageSegment } = options

  const currentPage = pageParam === undefined ? 1 : Number(pageParam)
  if (!Number.isInteger(currentPage) || currentPage < 1) return null

  // Page 1 must be reached at `baseUrl`, never `baseUrl/1`, so the canonical URL
  // for a given page stays unique.
  if (pageParam === '1') return null

  const total = items.length
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  if (currentPage > lastPage) return null

  const start = (currentPage - 1) * pageSize
  const end = Math.min(start + pageSize, total)
  const pagedBase = pageSegment ? `${baseUrl}/${pageSegment}` : baseUrl
  const urlFor = (n: number) => (n === 1 ? baseUrl : `${pagedBase}/${n}`)

  return {
    data: items.slice(start, end),
    start,
    end: end - 1,
    total,
    currentPage,
    size: pageSize,
    lastPage,
    url: {
      current: urlFor(currentPage),
      prev: currentPage > 1 ? urlFor(currentPage - 1) : undefined,
      next: currentPage < lastPage ? urlFor(currentPage + 1) : undefined,
      first: currentPage > 1 ? urlFor(1) : undefined,
      last: currentPage < lastPage ? urlFor(lastPage) : undefined
    }
  }
}

/**
 * Keep CMS-backed pages out of every cache between Sanity and the browser, so a
 * refresh always reflects the latest edit. Cost control happens one layer down:
 * `lib/sanity.ts` reads published content through Sanity's own CDN.
 */
export function noStore(headers: Headers) {
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
}
