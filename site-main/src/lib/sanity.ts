// src/lib/sanity.ts
import { sanityClient } from 'sanity:client'
import createImageUrlBuilder from "@sanity/image-url"; // Updated import
import { getReadingTime } from 'packages/pure/utils';

const builder = createImageUrlBuilder(sanityClient);

export function urlFor(source: any) {
  return builder.image(source);
}

export function getHeadingsFromPortableText(blocks: any[]) {
  if (!blocks) return [];
  return blocks
    .filter((node) => node._type === 'block' && (node.style === 'h2' || node.style === 'h3'))
    .map((node) => {
      const text = node.children.map((child: any) => child.text).join('');
      const slug = text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '');
      return {
        depth: parseInt(node.style.replace('h', '')),
        slug: slug,
        text: text,
      };
    });
}

export async function getSanityPosts() {
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
        metadata {
          dimensions
        }
      }
    },
    content
  }`;

  const posts = await sanityClient.fetch(query);

  return posts.map((post: any) => {
    const dimensions = post.heroImage?.asset?.metadata?.dimensions;

    const hasImage = post.heroImage && post.heroImage.asset;

    const readStats = getReadingTime(post.body || '')

    return {
      id: post.slug,
      slug: post.slug,
      body: post.content,
      collection: "blog",
      data: {
        title: post.title,
        description: post.description,
        publishDate: new Date(post.publishedAt),
        tags: post.tags || [],
        minutesRead: readStats.text,
        coverImage: hasImage ? {
           src: urlFor(post.heroImage).width(1200).url(),
           alt: post.heroImage.alt || post.title,
           color: post.heroImage.color,
           width: dimensions?.width || 1200,
           height: dimensions?.height || 800,
        } : undefined,
        heroImage: hasImage ? {
           src: urlFor(post.heroImage).width(1200).url(),
           alt: post.heroImage.alt || post.title,
           color: post.heroImage.color,
           width: dimensions?.width || 1200,
           height: dimensions?.height || 800
        } : undefined,
      },
    };
  });
}