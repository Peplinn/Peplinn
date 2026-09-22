import type { Page } from 'astro'

import { isDraftMode } from './sanity'

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

/** `s-maxage` / `stale-while-revalidate` pairs, in seconds. */
export const CACHE = {
  /** A single post. Rarely edited once published. */
  post: { sMaxAge: 600, swr: 604800 },
  /** Anything listing posts, where a new publish should surface promptly. */
  listing: { sMaxAge: 300, swr: 86400 },
  /** Pages that change only when I sit down and change them. */
  stable: { sMaxAge: 3600, swr: 604800 },
  /** Machine-read endpoints (search index, feeds). */
  data: { sMaxAge: 600, swr: 86400 }
} as const

/**
 * Let Vercel's edge serve the page while it refetches in the background.
 *
 * Two headers, because they answer different questions. `CDN-Cache-Control` is
 * read by the edge and stripped before the response reaches the browser, so the
 * edge can hold a copy for minutes while the browser still revalidates on every
 * navigation - which is cheap, since that revalidation hits a warm edge rather
 * than a cold function.
 *
 * Freshness after a publish comes from `s-maxage` alone (worst case: that many
 * seconds stale). There is deliberately no purge webhook; `/preview/<slug>` is
 * the escape hatch when an edit needs to be seen immediately.
 *
 * Caveat for callers: Vercel silently refuses to cache any response carrying
 * `Set-Cookie`, and a non-default `Vary` fragments the cache to uselessness.
 */
export function cacheable(headers: Headers, policy: { sMaxAge: number; swr: number }) {
  // Drafts are token-authenticated and must never sit in a shared cache. One
  // check covers both preview deployments and local dev.
  if (isDraftMode()) return noStore(headers)

  headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
  headers.set(
    'CDN-Cache-Control',
    `public, s-maxage=${policy.sMaxAge}, stale-while-revalidate=${policy.swr}`
  )
}
