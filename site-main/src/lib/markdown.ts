import { marked } from 'marked'
import markedKatex from 'marked-katex-extension'
import markedFootnote from 'marked-footnote'
import { gfmHeadingId } from 'marked-gfm-heading-id'
import { createHighlighter } from 'shiki'
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight
} from '@shikijs/transformers'

let highlighter: Awaited<ReturnType<typeof createHighlighter>> | null = null

async function getHighlighter() {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [
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
    })
  }
  return highlighter
}

export async function renderMarkdown(markdown: string) {
  const hl = await getHighlighter()

  const renderer = {
    code(codeOrObject: any, lang?: string) {
      const rawLang =
        typeof codeOrObject === 'object'
          ? codeOrObject.lang
          : lang

      const language =
        rawLang && hl.getLoadedLanguages().includes(rawLang)
          ? rawLang
          : 'plaintext'

      const code =
        typeof codeOrObject === 'object'
          ? codeOrObject.text
          : codeOrObject

      const html = hl.codeToHtml(code, {
        lang: language,
        themes: {
          light: 'github-light',
          dark: 'github-dark'
        },
        defaultColor: false,
        transformers: [
          transformerNotationDiff(),
          transformerNotationHighlight(),
          transformerNotationWordHighlight()
        ]
      })

      return `
        <figure class="astro-code relative group">
          ${html}
          <div
            class="language absolute text-sm text-foreground px-3 py-1 top-2 right-16 opacity-50 group-hover:opacity-0 transition-opacity uppercase"
          >
            ${language}
          </div>
          <button
            class="copy absolute top-2 right-2 p-1 rounded border border-border bg-muted hover:bg-primary/10 transition-all"
            title="Copy code"
          >
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

  marked.use({ renderer })
  marked.use(markedKatex({ throwOnError: false }))
  marked.use(gfmHeadingId())
  marked.use(markedFootnote())

  return marked.parse(markdown)
}
