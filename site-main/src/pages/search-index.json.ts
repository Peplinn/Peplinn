import type { APIRoute } from 'astro'

import { isVisualization, VISUALIZATIONS_HREF } from '../lib/projects'
import { getSanityPosts, getSanityProjects } from '../lib/sanity'

export const prerender = false

/** One searchable record, kept small enough to ship the whole index in one fetch. */
export type SearchEntry = {
  id: string
  title: string
  url: string
  /** Group label shown next to the result. */
  kind: string
  description: string
  tags: string[]
  /** ISO date, used only to break ties and to label the result. */
  date?: string
  /** Plain-text body the snippet is cut from. */
  body: string
}

/** Body text past this point is dead weight in the payload and never snippeted. */
const MAX_BODY_CHARS = 12000

/**
 * Markdown reads badly as a snippet - link syntax, fences and heading markers all
 * end up in the excerpt. This strips the markup rather than rendering it, since the
 * result is only ever matched against and shown as a short excerpt.
 */
function toPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s{0,3}[#>]+\s*/gm, '')
    .replace(/^\s{0,3}([-*_])\s*\1\s*\1[\s*\-_]*$/gm, ' ')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_BODY_CHARS)
}

export const GET: APIRoute = async () => {
  const [posts, projects] = await Promise.all([getSanityPosts(), getSanityProjects()])

  const entries: SearchEntry[] = [
    ...posts.map((post) => ({
      id: `writing:${post.slug}`,
      title: post.data.title,
      url: `/writing/${post.slug}`,
      kind: 'Writing',
      description: post.data.description,
      tags: post.data.tags,
      date: post.data.publishDate.toISOString(),
      body: toPlainText(post.body)
    })),
    ...projects.map((project) => ({
      id: `project:${project.slug}`,
      title: project.data.title,
      url: isVisualization(project) ? VISUALIZATIONS_HREF : '/projects',
      kind: isVisualization(project) ? 'Visualization' : 'Project',
      description: project.data.description,
      tags: [],
      body: toPlainText(
        [project.data.description, project.data.longDescription, project.data.approach]
          .filter(Boolean)
          .join('\n\n')
      )
    }))
  ]

  return new Response(JSON.stringify({ entries }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Same freshness contract as the pages themselves: an edit in Sanity shows up
      // on the next request rather than after a rebuild.
      'Cache-Control': 'public, max-age=0, must-revalidate'
    }
  })
}
