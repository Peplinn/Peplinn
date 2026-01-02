// src/lib/sanity.ts
import { sanityClient } from 'sanity:client'
import imageUrlBuilder from "@sanity/image-url";

const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: any) {
  return builder.image(source);
}

// Helper to extract headings from Portable Text for the Table of Contents
export function getHeadingsFromPortableText(block: any[]) {
  if (!block) return [];
  return block
    .filter((node) => node.style === "h2" || node.style === "h3")
    .map((node) => ({
      depth: parseInt(node.style.replace("h", "")),
      slug: node.children[0].text
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, ""),
      text: node.children[0].text,
    }));
}

// GROQ Query to fetch posts
// We assume 'baseContentFields' includes 'title', 'slug', 'description', and 'body'
export async function getSanityPosts() {
  const query = `*[_type == "blogPost"] | order(publishedAt desc) {
    _id,
    publishedAt,
    title,
    description,
    "slug": slug.current,
    tags,
    heroImage,
    body
  }`;

  const posts = await sanityClient.fetch(query);

  // Map Sanity data to the structure Astro Content Collections expects
  return posts.map((post: any) => ({
    id: post.slug,
    slug: post.slug,
    body: post.body, // This is Portable Text, not a string
    collection: "blog",
    data: {
      title: post.title,
      description: post.description,
      publishDate: new Date(post.publishedAt),
      tags: post.tags || [],
      // Handle image: assuming your theme expects an object or string
      coverImage: post.heroImage ? {
         src: urlFor(post.heroImage).width(1200).url(),
         alt: post.heroImage.alt || post.title
      } : undefined,
    },
  }));
}