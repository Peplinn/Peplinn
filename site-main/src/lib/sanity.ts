import { sanityClient } from 'sanity:client'
import createImageUrlBuilder from "@sanity/image-url"
import { getReadingTime } from 'packages/pure/utils'

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

export async function getSanityPosts(): Promise<WritingCollectionPost[]> {
  const query = `*[_type == "blogPost"] | order(publishedAt desc) {
    _id,
    publishedAt,
    title,
    description,
    "slug": slug.current,
    tags,
    heroImage {
      ...,
      asset-> {
        _id,
        metadata { dimensions }
      }
    },
    content
  }`

  const posts = await sanityClient.fetch(query)

  return posts.map((post: any) => {
    const rawMarkdown = post.content || post.body || ""
    const readStats = getReadingTime(rawMarkdown)

    return {
      id: post.slug,
      slug: post.slug,
      body: rawMarkdown,
      collection: 'writing',
      data: {
        title: post.title,
        description: post.description || '',
        comment: false,
        draft: false,
        publishDate: new Date(post.publishedAt),
        tags: post.tags || [],
        minutesRead: readStats.text,
        // 900px for full post hero (content column is max ~900px wide)
        heroImage: mapHeroImage(post.heroImage, post.title, 900),
        // 400px for card thumbnail (w-3/5 of a half-width card)
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