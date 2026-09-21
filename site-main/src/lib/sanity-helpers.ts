import type { Icons } from 'packages/pure/libs/icons'

import type { PostKind, WritingCollectionPost } from './sanity'

/**
 * The reader-facing name and mark for each kind of writing. One place, so the
 * legend on /writing and the cards it describes can never drift apart.
 */
export const KINDS: Record<PostKind, { label: string; icon: keyof typeof Icons }> = {
  article: { label: 'Article', icon: 'article' },
  guide: { label: 'Guide', icon: 'guide' },
  note: { label: 'Note', icon: 'note' }
}

export function groupSanityPostsByYear(posts: WritingCollectionPost[]) {
  return posts.reduce<Record<string, WritingCollectionPost[]>>((acc, post) => {
    const year = new Date(post.data.publishDate).getFullYear().toString()
    acc[year] ||= []
    acc[year].push(post)
    return acc
  }, {})
}

export function getSanityTagsWithCount(posts: WritingCollectionPost[]) {
  const map = new Map<string, number>()
  posts.forEach((p) => {
    p.data.tags.forEach((tag) => {
      map.set(tag, (map.get(tag) ?? 0) + 1)
    })
  })
  return Array.from(map.entries()).map(([tag, count]) => ({ tag, count }))
}

export function getSanityTags(posts: WritingCollectionPost[]) {
  return [...new Set(posts.flatMap((p) => p.data.tags))]
}
