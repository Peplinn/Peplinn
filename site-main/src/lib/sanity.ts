// src/lib/sanity.ts
import { sanityClient } from 'sanity:client'
import createImageUrlBuilder from "@sanity/image-url"
import { getReadingTime } from 'packages/pure/utils'

const builder = createImageUrlBuilder(sanityClient)

export function urlFor(source: any) {
  return builder.image(source)
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

// Build-safe Astro type
export type BlogCollectionPost = {
  id: string
  slug: string
  body: string
  collection: 'blog'
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
      src: { src: string; width: number; height: number; format: 'jpg' | 'png' }
      alt: string
      color?: string
      width?: number
      height?: number
      inferSize?: boolean
    }
    heroImage?: {
      src: { src: string; width: number; height: number; format: 'jpg' | 'png' }
      alt: string
      color?: string
      width?: number
      height?: number
      inferSize?: boolean
    }
  }
}


function astroImage(src: string, width: number, height: number, format: 'jpg' | 'png' = 'jpg') {
  return { src: { src, width, height, format } }
}

function mapHeroImage(image: any, fallbackAlt = '') {
  if (!image) return undefined;
  return {
    src: {
      src: image.src, // original URL
      width: image.width,
      height: image.height,
      format: 'jpg' // or whatever format it is
    },
    alt: image.alt ?? fallbackAlt,
    width: image.width,
    height: image.height,
    color: image.color,
  }
}

export async function getSanityPosts(): Promise<BlogCollectionPost[]> {
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
    const dimensions = post.heroImage?.asset?.metadata?.dimensions || { width: 1200, height: 800 }
    const hasImage = post.heroImage && post.heroImage.asset
    const rawMarkdown = post.content || post.body || ""
    const readStats = getReadingTime(rawMarkdown)

    const heroImage = hasImage
      ? {
          src: astroImage(
            urlFor(post.heroImage).width(1200).url(),
            dimensions?.width || 1200,
            dimensions?.height || 800,
            'jpg'
          ).src,
          alt: post.heroImage.alt || post.title,
          color: post.heroImage.color,
          width: dimensions?.width || 1200,
          height: dimensions?.height || 800
        }
      : undefined

    const coverImage = heroImage // reuse same

    return {
      id: post.slug,
      slug: post.slug,
      body: rawMarkdown,
      collection: 'blog',
      data: {
        title: post.title,
        description: post.description || '',
        comment: false,
        draft: false,
        publishDate: new Date(post.publishedAt),
        tags: post.tags || [],
        minutesRead: readStats.text,
        heroImage: mapHeroImage(post.heroImage ?? "Blog image"),
        coverImage: mapHeroImage(post.coverImage ?? "Blog image")
      }
    }
  })
}
