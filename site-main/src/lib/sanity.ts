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

export type ProjectCollectionItem = {
  id: string
  slug: string
  data: {
    title: string
    description: string
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


function astroImage(src: string, width: number, height: number, format: 'jpg' | 'png' = 'jpg') {
  return { src: { src, width, height, format } }
}

function mapHeroImage(image: any, fallbackAlt = '') {
  if (!image || !image.src) return undefined; // skip if no image

  return {
    // src: {
    //   src: image.src,      // must be string URL
    //   width: image.width || 1200,
    //   height: image.height || 800,
    //   format: 'jpg',       // Astro Image format
    // },
    src: typeof image.src === 'string' ? image.src : image.src,
    alt: image.alt ?? fallbackAlt,
    width: image.width || 1200,
    height: image.height || 800,
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
        heroImage: mapHeroImage(
          post.heroImage
            ? { 
                src: urlFor(post.heroImage).width(1200).url(),
                width: post.heroImage.asset?.metadata?.dimensions?.width,
                height: post.heroImage.asset?.metadata?.dimensions?.height,
                alt: post.heroImage.alt || post.title,
                color: post.heroImage.color
              }
            : null,
          post.title ?? 'Blog image'
        ),
        coverImage: mapHeroImage(
          post.coverImage
            ? {
                src: urlFor(post.coverImage).width(1200).url(),
                width: post.coverImage.asset?.metadata?.dimensions?.width,
                height: post.coverImage.asset?.metadata?.dimensions?.height,
                alt: post.coverImage.alt || post.title,
                color: post.coverImage.color
              }
            : null,
          post.title ?? 'Blog image'
        )
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
    const dimensions = project.image?.asset?.metadata?.dimensions || {
      width: 800,
      height: 600
    }

    const hasImage = project.image && project.image.asset

    return {
      id: project.slug,
      slug: project.slug,
      data: {
        title: project.title,
        description: project.description || '',
        github: project.github,
        liveSite: project.liveSite,
        image: hasImage
          ? {
              src: urlFor(project.image).width(800).url(),
              alt: project.image.alt || project.title,
              width: dimensions.width,
              height: dimensions.height,
              color: project.image.color
            }
          : undefined
      }
    }
  })
}