import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight
} from '@shikijs/transformers'
import GithubSlugger from 'github-slugger'
import { Marked } from 'marked'
import type { Tokens } from 'marked'
import markedFootnote from 'marked-footnote'
import { gfmHeadingId } from 'marked-gfm-heading-id'
import markedKatex from 'marked-katex-extension'
import { createHighlighter } from 'shiki'

import { markedCallouts } from './callouts'
import { urlFor } from './sanity'

const LANGS = [
  'js',
  'ts',
  'markdown',
  'html',
  'css',
  'python',
  'bash',
  'json',
  'yaml',
  'yml',
  'astro',
  'shell',
  'diff',
  'txt'
]

type Highlighter = Awaited<ReturnType<typeof createHighlighter>>

// Building a highlighter loads Shiki's grammars and themes - far too expensive to
// repeat per request now that these pages render on demand. Cache the promise (not
// the resolved value) so concurrent requests during a cold start share one build.
let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter() {
  highlighterPromise ??= createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: LANGS
  })
  return highlighterPromise
}

function codeRenderer(hl: Highlighter) {
  return function code(token: Tokens.Code) {
    const requestedLang = token.lang || 'plaintext'
    const language = hl.getLoadedLanguages().includes(requestedLang) ? requestedLang : 'plaintext'

    const html = hl.codeToHtml(token.text, {
      lang: language,
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      },
      defaultColor: false,
      transformers: [
        transformerNotationDiff(),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        {
          name: 'add-line-classes',
          code(root) {
            const pre = root.children.find((c) => c.type === 'element' && c.tagName === 'pre')
            if (pre?.type === 'element') {
              pre.properties.style = 'background-color: transparent !important;'
              const codeEl = pre.children.find((c) => c.type === 'element' && c.tagName === 'code')
              if (codeEl?.type === 'element') {
                codeEl.children.forEach((line) => {
                  if (line.type === 'element' && line.tagName === 'span') {
                    line.properties.className ||= []
                    ;(line.properties.className as string[]).push('line')
                  }
                })
              }
            }
          }
        }
      ]
    })

    return `
      <figure class="astro-code relative group">
        ${html}
        <div class="language absolute text-sm text-foreground px-3 py-1 top-2 right-16 opacity-50 group-hover:opacity-0 transition-opacity uppercase">
          ${language}
        </div>
        <button class="copy absolute top-2 right-2 p-1 rounded border border-border bg-muted hover:bg-primary/10 transition-all" title="Copy code">
          <span class="ready">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </span>
          <span class="success hidden">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 stroke-green-500"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
        </button>
      </figure>
    `
  }
}

/** Sanity encodes intrinsic dimensions in the asset filename, e.g. `-1200x800.jpg`. */
const SANITY_IMAGE_RE =
  /^https:\/\/cdn\.sanity\.io\/images\/[^/]+\/[^/]+\/[^/?]+-(\d+)x(\d+)\.(\w+)/i

/** Widest the prose column ever gets, so the browser never fetches more than it needs. */
const SIZES = '(min-width: 768px) 720px, 100vw'

const SRCSET_WIDTHS = [640, 960, 1280, 1920]

function escapeAttr(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** `![alt](….mp4)` / `.webm` / `.mov`, optionally followed by a query or `#WxH`. */
const VIDEO_RE = /\.(mp4|webm|mov)(?:[?#]|$)/i

/** The Studio appends a video's dimensions on upload as `#1280x720`; see CustomMarkdownInput. */
const VIDEO_DIMS_RE = /#(\d+)x(\d+)$/

/**
 * A video written as a markdown image becomes a silent, looping clip - the GIF
 * replacement. It costs nothing at page load: `preload="none"` and no `autoplay`,
 * so not a byte is fetched until `scripts/lazy-video.ts` sees it approach the
 * viewport and starts it (and pauses it again once it leaves). Readers who ask
 * for reduced motion get a still box with controls instead of an autoplaying loop.
 */
function renderVideo(href: string, alt: string) {
  const [, w, h] = VIDEO_DIMS_RE.exec(href) ?? []
  // Without dimensions the box has no height until the video's metadata arrives,
  // which shifts everything below it; `aspect-ratio` reserves the space up front.
  const dims = w && h ? ` width="${w}" height="${h}" style="aspect-ratio:${w}/${h}"` : ''
  const src = escapeAttr(href.replace(VIDEO_DIMS_RE, ''))
  const label = alt ? ` aria-label="${alt}"` : ''

  return `<video data-lazy-video src="${src}"${dims}${label} muted loop playsinline preload="none" class="lazy-video"></video>`
}

/**
 * Post bodies are author-written markdown, so every `![]()` used to become a bare
 * `<img>` - no lazy loading, no intrinsic size (hence layout shift on every image),
 * and no resizing however large the original was.
 *
 * Returns a fresh renderer per document so the "first image" counter is scoped to
 * one render rather than shared across concurrent requests.
 */
function imageRenderer(eagerFirstImage: boolean) {
  let seen = 0

  return function image(token: Tokens.Image) {
    const href = token.href ?? ''
    const alt = escapeAttr(token.text ?? '')
    const title = token.title ? ` title="${escapeAttr(token.title)}"` : ''

    if (VIDEO_RE.test(href)) return renderVideo(href, alt)

    const sanity = SANITY_IMAGE_RE.exec(href)
    const isGif = sanity?.[3].toLowerCase() === 'gif'

    // Only the first image is plausibly above the fold; eagerly loading the rest
    // is what made image-heavy posts so slow to settle. Even that one is lazy
    // when the page already has a hero above it, and a GIF never jumps the
    // queue: an un-resizable multi-megabyte GIF fetched at high priority starved
    // the hero image and pushed mobile LCP on the snowplow post to 17s.
    const eager = eagerFirstImage && seen++ === 0 && !isGif
    const loading = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy" decoding="async"'

    // Someone else's host: no dimensions are derivable and we cannot resize it,
    // so lazy loading is all that's on offer.
    if (!sanity) {
      return `<img src="${escapeAttr(href)}" alt="${alt}"${title} ${loading} class="zoomable" />`
    }

    const [, rawWidth, rawHeight] = sanity
    const width = Number(rawWidth)
    const dims = `width="${width}" height="${Number(rawHeight)}"`

    // Passed through untouched - see `isGif` in lib/sanity.ts for why. A heavy
    // animation belongs in a video (uploads over the Studio's GIF limit are
    // refused for exactly this reason).
    if (isGif) {
      return `<img src="${escapeAttr(href)}" alt="${alt}"${title} ${dims} ${loading} />`
    }

    // Never upscale: a 900px-wide original has nothing to offer at 1920.
    const widths = SRCSET_WIDTHS.filter((candidate) => candidate <= width)
    if (widths.length === 0) widths.push(width)

    const render = (w: number) => urlFor(href).width(w).format('webp').quality(80).fit('max').url()
    const srcset = widths.map((w) => `${escapeAttr(render(w))} ${w}w`).join(', ')
    const src = escapeAttr(render(widths[widths.length - 1]))

    return `<img src="${src}" srcset="${srcset}" sizes="${SIZES}" alt="${alt}"${title} ${dims} ${loading} class="zoomable" />`
  }
}

/**
 * Markdown may also contain raw `<img>` HTML, which marked passes straight through
 * without it ever reaching the renderer above. Give anything that escaped the same
 * lazy treatment.
 */
function lazyLoadRawImages(html: string): string {
  return html.replace(
    /<img(?![^>]*\bloading=)([^>]*?)\/?>/gi,
    '<img$1 loading="lazy" decoding="async">'
  )
}

/**
 * `gfmHeadingId` gives every heading an id but nothing to click. Append a `#`
 * permalink so a reader can grab the URL of any section; its show-on-hover styling
 * lives with the other prose heading rules in uno.config.ts.
 */
function addHeadingAnchors(html: string): string {
  return html.replace(
    /<h([1-6]) id="([^"]+)">([\s\S]*?)<\/h\1>/g,
    (_, level, id, text) =>
      `<h${level} id="${id}">${text}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${level}>`
  )
}

/**
 * A fresh `Marked` for every call - deliberately NOT shared.
 *
 * `marked-footnote` keeps mutable state (`hasFootnotes`) alongside its extensions
 * and only clears it from `walkTokens`, which runs during `parse()` but not during
 * `lexer()`. A shared instance therefore leaves that flag set after any `lexer()`
 * call, and the next `parse()` of a document containing `[^ref]` skips pushing the
 * footnotes container - so the inline tokenizer reads `tokens[0].rawItems` off a
 * paragraph and throws `Cannot read properties of undefined (reading 'filter')`.
 * Sharing one instance across concurrent requests would interleave that state too.
 *
 * Constructing this is cheap; the expensive part is the highlighter, which stays
 * memoized above.
 */
async function createMarked(eagerFirstImage = true) {
  const hl = await getHighlighter()
  const instance = new Marked()
  instance.use({ renderer: { code: codeRenderer(hl), image: imageRenderer(eagerFirstImage) } })
  instance.use(markedKatex({ throwOnError: false }))
  // Registered before the built-in blockquote rule gets a look, so `> [!note]`
  // becomes a callout while every other blockquote is left alone.
  instance.use(markedCallouts())
  instance.use(gfmHeadingId())
  instance.use(markedFootnote())
  return instance
}

/**
 * Pass `hasHero: true` when the page renders a hero image above this content -
 * that hero is the LCP element, so no body image should compete with it.
 */
export async function renderMarkdown(markdown: string, { hasHero = false } = {}) {
  const instance = await createMarked(!hasHero)
  const html = await instance.parse(markdown || '')
  return addHeadingAnchors(lazyLoadRawImages(html))
}

/** Headings for the sidebar TOC, slugged to match `gfmHeadingId`'s anchors. */
export async function extractHeadings(markdown: string) {
  const instance = await createMarked()
  const slugger = new GithubSlugger()
  return instance
    .lexer(markdown || '')
    .filter((token) => token.type === 'heading')
    .map((token: any) => ({
      depth: token.depth,
      text: token.text,
      slug: slugger.slug(token.text)
    }))
}
