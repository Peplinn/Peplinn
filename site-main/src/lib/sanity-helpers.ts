import type { BlogCollectionPost } from './sanity'

export function groupSanityPostsByYear(posts: BlogCollectionPost[]) {
  return posts.reduce<Record<string, BlogCollectionPost[]>>((acc, post) => {
    const year = new Date(post.data.publishDate).getFullYear().toString()
    acc[year] ||= []
    acc[year].push(post)
    return acc
  }, {})
}

export function getSanityTagsWithCount(posts: BlogCollectionPost[]) {
  const map = new Map<string, number>()
  posts.forEach(p => {
    p.data.tags.forEach(tag => {
      map.set(tag, (map.get(tag) ?? 0) + 1)
    })
  })
  return Array.from(map.entries()).map(([tag, count]) => ({ tag, count }))
}

export function getSanityTags(posts: BlogCollectionPost[]) {
  return [...new Set(posts.flatMap(p => p.data.tags))]
}
