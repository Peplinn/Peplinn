import createImageUrlBuilder from '@sanity/image-url'
import { getReadingTime } from 'packages/pure/utils'
import { sanityClient as baseClient } from 'sanity:client'

/**
 * Read an env var at *request* time.
 *
 * `import.meta.env` is inlined by Vite when the bundle is built, so on its own it
 * bakes build-time values into the serverless function. `process.env` is what the
 * function actually sees when a request comes in; `import.meta.env` stays as the
 * fallback for `astro build` and `astro dev`.
 */
function readEnv(key: string): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[key] : undefined
  return fromProcess ?? (import.meta.env as Record<string, string | undefined>)[key]
}

/**
 * Drafts are visible on Vercel preview deployments and in local dev, never on the
 * production domain. Evaluated per call so the deployment environment is read at
 * runtime rather than frozen into the build.
 */
export function isDraftMode(): boolean {
  return readEnv('VERCEL_ENV') === 'preview' || import.meta.env.DEV
}

/**
 * Draft mode bypasses the Sanity CDN entirely and authenticates, so unpublished
 * edits show up on the very next request. Production reads through the CDN,
 * which Sanity purges on publish - fresh within seconds, without paying an
 * uncached API round trip per page view.
 *
 * Production needs no token: the dataset is public, so published documents
 * resolve anonymously. Drafts don't - the `drafts.` path requires auth whatever
 * the dataset's visibility - which is why only this branch carries one.
 */
function getClient() {
  return isDraftMode()
    ? baseClient.withConfig({
        useCdn: false,
        token: readEnv('SANITY_API_TOKEN')
      })
    : baseClient.withConfig({ useCdn: true })
}

export const sanityClient = getClient()

// Image URLs only need projectId/dataset, so build them off the untokened client.
const builder = createImageUrlBuilder(baseClient)

export function urlFor(source: any) {
  return builder.image(source)
}

/**
 * Sanity's image API returns only the FIRST FRAME of an animated GIF as soon as
 * any transform is applied, and it has no video output - so an animated hero was
 * silently rendering as a still. GIFs are passed through untouched, at the cost
 * of their original weight; there is no server-side way to shrink one.
 */
function isGif(source: unknown): boolean {
  if (typeof source === 'string') return /\.gif(\?|$)/i.test(source)

  // Sanity asset ids end in the file extension, e.g. `image-<hash>-364x364-gif`.
  const asset = (source as { asset?: { _ref?: string; _id?: string } })?.asset
  const ref = asset?._ref ?? asset?._id
  return typeof ref === 'string' && ref.endsWith('-gif')
}

function sanityImageUrl(source: any, width: number) {
  const url = urlFor(source)
  return isGif(source) ? url.url() : url.width(width).format('webp').quality(80).url()
}

export function getHeadingsFromPortableText(blocks: any[]) {
  if (!blocks) return []
  return blocks
    .filter((node) => node._type === 'block' && (node.style === 'h2' || node.style === 'h3'))
    .map((node) => {
      const text = node.children.map((child: any) => child.text).join('')
      const slug = text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
      return {
        depth: parseInt(node.style.replace('h', '')),
        slug: slug,
        text: text
      }
    })
}

/**
 * What kind of writing a piece is, as the front end sees it.
 *
 * Deliberately one flat discriminator even though the back end models guides as a
 * separate document type - rendering shouldn't have to care how the CMS stores
 * the distinction.
 */
export const POST_KINDS = ['article', 'guide', 'note'] as const
export type PostKind = (typeof POST_KINDS)[number]

export type WritingCollectionPost = {
  id: string
  slug: string
  body: string
  collection: 'writing'
  data: {
    title: string
    description: string
    kind: PostKind
    comment: boolean
    draft: boolean
    publishDate: Date
    tags: string[]
    minutesRead: string
    updatedDate?: Date
    coverImage?: {
      src: string
      alt: string
      color?: string
      width?: number
      height?: number
      inferSize?: boolean
    }
    heroImage?: {
      src: string
      alt: string
      color?: string
      width?: number
      height?: number
      inferSize?: boolean
    }
  }
}

export type ProjectType = 'visualization' | 'program'

export type ProjectCollectionItem = {
  id: string
  slug: string
  data: {
    title: string
    description: string
    featured: boolean
    type: ProjectType
    longDescription?: string
    approach?: string
    github?: string
    liveSite?: string
    image?: {
      src: string
      alt: string
      width: number
      height: number
      color?: string
      /** Large rendition, for the visualization lightbox. */
      full?: string
    }
  }
}

/**
 * Drafts skip the schema's `required()` rules, so a work-in-progress post can be
 * missing `publishedAt` entirely. `FormattedDate` calls `.toISOString()` and
 * `getFormattedDate` calls `Intl.format()` on this value - both throw RangeError on
 * an Invalid Date and turn the whole page into a 500. Always hand back a real Date.
 */
function toValidDate(...candidates: unknown[]): Date {
  for (const candidate of candidates) {
    if (!candidate) continue
    const date = new Date(candidate as string)
    if (!Number.isNaN(date.getTime())) return date
  }
  return new Date()
}

function mapHeroImage(source: any, alt: string, width: number) {
  if (!source?.asset) return undefined
  const dim = source.asset?.metadata?.dimensions

  // A draft can reference an asset that no longer resolves (image removed mid-edit),
  // and the URL builder throws rather than returning null. One broken image should
  // not cost the reader the entire post.
  let src: string
  try {
    src = sanityImageUrl(source, width)
  } catch {
    return undefined
  }

  return {
    src,
    alt: source.alt ?? alt,
    width: dim?.width ?? width,
    height: dim?.height ?? 800,
    color: source.color
  }
}

const POST_PROJECTION = `
  _id,
  _type,
  publishedAt,
  _updatedAt,
  _createdAt,
  title,
  description,
  type,
  "slug": slug.current,
  tags,
  "tagTitles": tags[]->title,
  heroImage {
    ...,
    asset-> { _id, metadata { dimensions } }
  },
  content
`

/**
 * Tags moved from free-text strings to references to `tag` documents. Posts written
 * before that change still carry plain strings, so accept either: dereferenced
 * titles win, and anything still stored as a string is passed through.
 */
function normalizeTags(post: any): string[] {
  const isString = (t: unknown): t is string => typeof t === 'string' && t.length > 0

  const resolved = Array.isArray(post.tagTitles) ? post.tagTitles.filter(isString) : []
  if (resolved.length) return resolved

  return Array.isArray(post.tags) ? post.tags.filter(isString) : []
}

/**
 * Collapses the CMS's two-axis model - document type, plus a `type` field on
 * blogPost - into the single discriminator the front end renders from.
 *
 * Posts written before the `type` field existed have none, so they read as
 * articles rather than disappearing.
 */
function postKind(post: any): PostKind {
  if (post._type === 'guide') return 'guide'
  return post.type === 'note' ? 'note' : 'article'
}

function mapPost(post: any): WritingCollectionPost {
  const rawMarkdown = post.content || post.body || ''
  const readStats = getReadingTime(rawMarkdown)
  const isDraftDocument = post._id.startsWith('drafts.')

  return {
    id: post.slug,
    slug: post.slug,
    body: rawMarkdown,
    collection: 'writing',
    data: {
      title: post.title,
      description: post.description || '',
      kind: postKind(post),
      comment: false,
      draft: isDraftDocument,
      publishDate: toValidDate(post.publishedAt, post._updatedAt, post._createdAt),
      tags: normalizeTags(post),
      minutesRead: readStats.text,
      heroImage: mapHeroImage(post.heroImage, post.title, 900),
      coverImage: mapHeroImage(post.heroImage, post.title, 400)
    }
  }
}

export async function getSanityPosts(): Promise<WritingCollectionPost[]> {
  const draftMode = isDraftMode()

  // In draft mode a slug can come back twice - once as `drafts.<id>`, once as the
  // published document. Ordering by `_updatedAt` puts the draft first, and the
  // dedupe below keeps it. Production filters drafts out at the query.
  const query = draftMode
    ? `*[_type in ["blogPost", "guide"]] | order(_updatedAt desc) { ${POST_PROJECTION} }`
    : `*[_type in ["blogPost", "guide"] && !(_id in path("drafts.**"))] | order(publishedAt desc) { ${POST_PROJECTION} }`

  const rawPosts = await getClient().fetch(query)

  let posts = rawPosts
  if (draftMode) {
    const seen = new Set()
    posts = rawPosts.filter((post: any) => {
      if (seen.has(post.slug)) return false
      seen.add(post.slug)
      return true
    })
  }

  return posts
    .map(mapPost)
    .sort(
      (a: WritingCollectionPost, b: WritingCollectionPost) =>
        b.data.publishDate.getTime() - a.data.publishDate.getTime()
    )
}

export async function getSanityProjects(): Promise<ProjectCollectionItem[]> {
  const query = `*[_type == "project"] | order(publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    description,
    longDescription,
    approach,
    featured,
    type,
    github,
    liveSite,
    image {
      ...,
      asset-> {
        _id,
        metadata { dimensions }
      }
    }
  }`

  const projects = await getClient().fetch(query)

  return projects.map((project: any) => {
    const dim = project.image?.asset?.metadata?.dimensions
    const hasImage = project.image && project.image.asset

    return {
      id: project.slug,
      slug: project.slug,
      data: {
        title: project.title,
        description: project.description || '',
        featured: project.featured,
        type: (project.type ?? 'visualization') as ProjectType,
        longDescription: project.longDescription,
        approach: project.approach,
        github: project.github,
        liveSite: project.liveSite,
        image: hasImage
          ? {
              src: sanityImageUrl(project.image, 400),
              alt: project.image.alt || project.title,
              width: dim?.width ?? 400,
              height: dim?.height ?? 300,
              color: project.image.color,
              // Only ever fetched when a reader opens the lightbox.
              full: sanityImageUrl(project.image, 1600)
            }
          : undefined
      }
    }
  })
}

export type AboutPage = {
  heading: string
  body: string
  bookshelfHeading?: string
  bookshelfIntro?: string
}

export type NowSection = {
  heading: string
  body: string
  updatedAt?: Date
}

export type Book = {
  id: string
  title: string
  author?: string
  status: 'reading' | 'finished' | 'want'
  note?: string
  link?: string
  finishedAt?: Date
  coverImage?: { src: string; alt: string; width: number; height: number }
}

export type TilEntry = {
  id: string
  slug: string
  title: string
  content: string
  publishDate: Date
  tags: string[]
}

/**
 * Singletons are fetched by type rather than by a fixed `_id`: ordering by
 * `_updatedAt` means draft mode naturally sees the draft, while production filters
 * drafts out at the query - the same rule the posts use.
 */
async function fetchSingleton(type: string, projection: string) {
  const filter = isDraftMode()
    ? `*[_type == "${type}"]`
    : `*[_type == "${type}" && !(_id in path("drafts.**"))]`
  return getClient().fetch(`${filter} | order(_updatedAt desc)[0] { ${projection} }`)
}

export async function getAboutPage(): Promise<AboutPage | null> {
  const doc = await fetchSingleton('aboutPage', 'heading, body, bookshelfHeading, bookshelfIntro')
  if (!doc) return null
  return {
    heading: doc.heading || 'About',
    body: doc.body || '',
    bookshelfHeading: doc.bookshelfHeading || undefined,
    bookshelfIntro: doc.bookshelfIntro || undefined
  }
}

export async function getNowSection(): Promise<NowSection | null> {
  const doc = await fetchSingleton('nowPage', 'heading, body, updatedAt, _updatedAt')
  if (!doc) return null
  return {
    heading: doc.heading || 'Now',
    body: doc.body || '',
    updatedAt: doc.updatedAt ? toValidDate(doc.updatedAt, doc._updatedAt) : undefined
  }
}

export async function getBooks(): Promise<Book[]> {
  const filter = isDraftMode()
    ? `*[_type == "book"]`
    : `*[_type == "book" && !(_id in path("drafts.**"))]`

  const books = await getClient().fetch(`${filter} | order(coalesce(finishedAt, _createdAt) desc) {
    _id,
    title,
    author,
    status,
    note,
    link,
    finishedAt,
    coverImage { ..., asset-> { _id, metadata { dimensions } } }
  }`)

  return books.map((b: any) => ({
    id: b._id,
    title: b.title,
    author: b.author,
    status: b.status ?? 'reading',
    note: b.note,
    link: b.link,
    finishedAt: b.finishedAt ? toValidDate(b.finishedAt) : undefined,
    coverImage: mapHeroImage(b.coverImage, b.title, 480)
  }))
}

/** Newest TILs first. `limit` caps how many the timeline renders. */
export async function getTils(limit?: number): Promise<TilEntry[]> {
  const filter = isDraftMode()
    ? `*[_type == "til"]`
    : `*[_type == "til" && !(_id in path("drafts.**"))]`
  const slice = limit ? `[0...${limit}]` : ''

  const entries = await getClient().fetch(
    `${filter} | order(publishedAt desc)${slice} {
      _id, title, content, publishedAt, _updatedAt, _createdAt, tags
    }`
  )

  return entries.map((t: any) => ({
    id: t._id,
    slug: t._id.replace(/^drafts\./, ''),
    title: t.title,
    content: t.content || '',
    publishDate: toValidDate(t.publishedAt, t._updatedAt, t._createdAt),
    tags: t.tags || []
  }))
}

/** Total TIL count, so the timeline can say how many are hidden. */
export async function getTilCount(): Promise<number> {
  const filter = isDraftMode()
    ? `*[_type == "til"]`
    : `*[_type == "til" && !(_id in path("drafts.**"))]`
  return getClient().fetch(`count(${filter})`)
}

export type GuideStep = {
  slug: string
  title: string
  description: string
  content: string
}

export type Guide = {
  slug: string
  title: string
  description: string
  content: string
  publishDate: Date
  tags: string[]
  steps: GuideStep[]
}

/**
 * A guide by slug, with its steps already resolved and in order. Not routed
 * through `getSanityPosts()` / `WritingCollectionPost` - a guide isn't a flat
 * article, it has children, and this page renders its own template rather than
 * reusing `BlogPost.astro`.
 *
 * `sections[]->` dereferences by the reference's stored id, which is normally
 * the published document. A step that exists only as an unpublished draft (never
 * published, then referenced) can dereference to null in draft mode - a known
 * edge case, not handled here, since there's no content yet that hits it.
 */
export async function getGuideBySlug(slug: string): Promise<Guide | null> {
  const draftMode = isDraftMode()
  const query = draftMode
    ? `*[_type == "guide" && slug.current == $slug] | order(_updatedAt desc) [0]`
    : `*[_type == "guide" && slug.current == $slug && !(_id in path("drafts.**"))] [0]`

  const raw = await getClient().fetch(
    `${query} {
      title,
      description,
      content,
      publishedAt,
      _updatedAt,
      _createdAt,
      "tagTitles": tags[]->title,
      "steps": sections[]-> { title, description, content, "slug": slug.current }
    }`,
    { slug }
  )

  if (!raw) return null

  return {
    slug,
    title: raw.title,
    description: raw.description || '',
    content: raw.content || '',
    publishDate: toValidDate(raw.publishedAt, raw._updatedAt, raw._createdAt),
    tags: normalizeTags(raw),
    steps: (raw.steps || []).filter((s: GuideStep | null): s is GuideStep => s !== null)
  }
}

export type NewsletterIssue = {
  slug: string
  title: string
  description: string
  content: string
  publishDate: Date
}

function mapNewsletterIssue(issue: any): NewsletterIssue {
  return {
    slug: issue.slug,
    title: issue.title,
    description: issue.description || '',
    content: issue.content || '',
    publishDate: toValidDate(issue.publishedAt, issue._updatedAt, issue._createdAt)
  }
}

const NEWSLETTER_PROJECTION = `
  title, description, content, publishedAt, _updatedAt, _createdAt, "slug": slug.current
`

/** Published issues, newest first. */
export async function getNewsletterIssues(): Promise<NewsletterIssue[]> {
  const filter = isDraftMode()
    ? `*[_type == "newsletterIssue"]`
    : `*[_type == "newsletterIssue" && !(_id in path("drafts.**"))]`

  const issues = await getClient().fetch(
    `${filter} | order(publishedAt desc) { ${NEWSLETTER_PROJECTION} }`
  )

  return issues.map(mapNewsletterIssue)
}

export async function getNewsletterIssue(slug: string): Promise<NewsletterIssue | null> {
  const query = isDraftMode()
    ? `*[_type == "newsletterIssue" && slug.current == $slug] | order(_updatedAt desc) [0]`
    : `*[_type == "newsletterIssue" && slug.current == $slug && !(_id in path("drafts.**"))] [0]`

  const raw = await getClient().fetch(`${query} { ${NEWSLETTER_PROJECTION} }`, { slug })
  return raw ? mapNewsletterIssue(raw) : null
}
