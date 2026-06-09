import { sanityClient as baseClient } from 'sanity:client' // Switch to explicit creation for flexible config
import createImageUrlBuilder from "@sanity/image-url"
import { getReadingTime } from 'packages/pure/utils'

// 1. Determine if we are on Vercel's preview/test server or local development
const isPreview = import.meta.env.VERCEL_ENV === 'preview' || import.meta.env.DEV

// 2. Configure the client dynamically
export const sanityClient = isPreview
  ? baseClient.withConfig({
      useCdn: false, // Bypass CDN to see edits instantly
      token: import.meta.env.SANITY_API_TOKEN, // Safely append your secret draft token
    })
  : baseClient

const builder = createImageUrlBuilder(sanityClient)

export function urlFor(source: any) {
  return builder.image(source)
}

function sanityImageUrl(source: any, width: number) {
  return urlFor(source).width(width).format('webp').quality(80).url()
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
        text: text,
      }
    })
}

export type WritingCollectionPost = {
  id: string
  slug: string
  body: string
  collection: 'writing'
  data: {
    title: string
    description: string
    comment: boolean
    draft: boolean
    publishDate: Date
    tags: string[]
    minutesRead: string
    updatedDate?: Date
    coverImage?: {
      src: { src: string; width: number; height: number; format: 'webp' }
      alt: string
      color?: string
      width?: number
      height?: number
      inferSize?: boolean
    }
    heroImage?: {
      src: { src: string; width: number; height: number; format: 'webp' }
      alt: string
      color?: string
      width?: number
      height?: number
      inferSize?: boolean
    }
  }
}

export type ProjectCollectionItem = {
  id: string
  slug: string
  data: {
    title: string
    description: string
    featured: boolean
    type: 'project' | 'visualization'
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
    }
  }
}

function mapHeroImage(source: any, alt: string, width: number) {
  if (!source?.asset) return undefined
  const dim = source.asset?.metadata?.dimensions
  return {
    src: sanityImageUrl(source, width),
    alt: source.alt ?? alt,
    width: dim?.width ?? width,
    height: dim?.height ?? 800,
    color: source.color,
  }
}

// 3. Updated fetcher function with Foolproof Preview Logic
export async function getSanityPosts(): Promise<WritingCollectionPost[]> {
  // If preview, look for drafts and group by slug. If production, completely filter out drafts.
  const query = isPreview 
    ? `*[_type == "blogPost"] | order(_updatedAt desc) {
        _id,
        publishedAt,
        _updatedAt,
        title,
        description,
        "slug": slug.current,
        tags,
        heroImage {
          ...,
          asset-> { _id, metadata { dimensions } }
        },
        content
      }`
    : `*[_type == "blogPost" && !(_id in path("drafts.**"))] | order(publishedAt desc) {
        _id,
        publishedAt,
        title,
        description,
        "slug": slug.current,
        tags,
        heroImage {
          ...,
          asset-> { _id, metadata { dimensions } }
        },
        content
      }`

  const rawPosts = await sanityClient.fetch(query)
  
  // Deduplicate drafts for the Preview environment
  let posts = rawPosts
  if (isPreview) {
    const seen = new Set()
    posts = rawPosts.filter((post: any) => {
      if (seen.has(post.slug)) return false
      seen.add(post.slug)
      return true
    })
  }

  return posts.map((post: any) => {
    const rawMarkdown = post.content || post.body || ""
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
        comment: false,
        draft: isDraftDocument, // Properly flags it as a draft in Astro
        publishDate: new Date(post.publishedAt || post._updatedAt),
        tags: post.tags || [],
        minutesRead: readStats.text,
        heroImage: mapHeroImage(post.heroImage, post.title, 900),
        coverImage: mapHeroImage(post.heroImage, post.title, 400),
      }
    }
  })
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

  const projects = await sanityClient.fetch(query)

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
        type: project.type ?? 'project',
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
              color: project.image.color
            }
          : undefined
      }
    }
  })
}