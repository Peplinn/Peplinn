import { Marked } from 'marked'
import type { Tokens } from 'marked'
import markedKatex from 'marked-katex-extension'
import markedFootnote from 'marked-footnote'
import { gfmHeadingId } from 'marked-gfm-heading-id'
import { createHighlighter } from 'shiki'
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight
} from '@shikijs/transformers'
import GithubSlugger from 'github-slugger'

const LANGS = [
  'js', 'ts',
  'markdown',
  'html', 'css',
  'python',
  'bash',
  'json',
  'yaml', 'yml',
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
    const language = hl.getLoadedLanguages().includes(requestedLang)
      ? requestedLang
      : 'plaintext'

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

// One configured instance, built once. Calling `marked.use()` per render stacks a
// fresh copy of every extension onto the shared singleton on each request.
let markedPromise: Promise<Marked> | null = null

function getMarked() {
  markedPromise ??= getHighlighter().then((hl) => {
    const instance = new Marked()
    instance.use({ renderer: { code: codeRenderer(hl) } })
    instance.use(markedKatex({ throwOnError: false }))
    instance.use(gfmHeadingId())
    instance.use(markedFootnote())
    return instance
  })
  return markedPromise
}

export async function renderMarkdown(markdown: string) {
  const instance = await getMarked()
  return instance.parse(markdown || '')
}

/** Headings for the sidebar TOC, slugged to match `gfmHeadingId`'s anchors. */
export async function extractHeadings(markdown: string) {
  const instance = await getMarked()
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
