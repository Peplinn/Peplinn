import type { MarkedExtension, Token, Tokens } from 'marked'

/**
 * Obsidian-style callouts.
 *
 *     > [!warning] Mind the gap
 *     > The platform is further away than it looks.
 *
 * The type in `[!...]` is free text: anything unrecognised still renders as a
 * callout, using the default colour and icon, so a typo degrades rather than
 * disappears. A `+` or `-` after the type makes the callout foldable, open and
 * closed respectively - `> [!note]- Details` collapses until clicked.
 *
 * ## Adding a type
 *
 * 1. Add an entry to `CALLOUT_TYPES` below, pointing at one of `ICONS` (or add a
 *    new icon - the path data for a 24x24 stroke icon).
 * 2. Give it a colour in `app.css`, under the callout section:
 *    `.callout[data-callout='myType'] { --callout-color: <h> <s>% <l>%; }`
 *
 * Aliases are just extra keys pointing at the same definition, exactly as
 * Obsidian treats `tip`/`hint`/`important`.
 */

/** 24x24 stroke icons, sharing the attributes set in `renderIcon`. */
const ICONS: Record<string, string> = {
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  clipboard:
    '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M8 12h8"/><path d="M8 16h6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  checkList:
    '<path d="m3 7 2 2 4-4"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 18h8"/>',
  flame:
    '<path d="M12 2c1 4 4 5 4 9a4 4 0 0 1-8 0c0-1.5.5-2.5 1-3.5C10 10 12 10 12 2Z"/><path d="M12 22a6 6 0 0 0 6-6c0-2-1-3.5-2-5"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  question:
    '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  warning:
    '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  cross: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>',
  bug: '<path d="M8 2 9.5 4.5"/><path d="m16 2-1.5 2.5"/><path d="M8 5h8a4 4 0 0 1 4 4v3a8 8 0 0 1-16 0V9a4 4 0 0 1 4-4Z"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m3.5 18 3-1.5"/><path d="m20.5 18-3-1.5"/><path d="m3.5 6.5 3 1.5"/><path d="m20.5 6.5-3 1.5"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  quote:
    '<path d="M6 15a3 3 0 1 1 3-3c0 2.5-1.5 4.5-4 6"/><path d="M16 15a3 3 0 1 1 3-3c0 2.5-1.5 4.5-4 6"/>'
}

type CalloutType = { label: string; icon: keyof typeof ICONS }

/** Every key is a callout name that may appear in `[!...]`. */
const CALLOUT_TYPES: Record<string, CalloutType> = {
  note: { label: 'Note', icon: 'pencil' },
  abstract: { label: 'Abstract', icon: 'clipboard' },
  summary: { label: 'Summary', icon: 'clipboard' },
  tldr: { label: 'TL;DR', icon: 'clipboard' },
  info: { label: 'Info', icon: 'info' },
  todo: { label: 'Todo', icon: 'checkList' },
  tip: { label: 'Tip', icon: 'flame' },
  hint: { label: 'Hint', icon: 'flame' },
  important: { label: 'Important', icon: 'flame' },
  success: { label: 'Success', icon: 'check' },
  check: { label: 'Check', icon: 'check' },
  done: { label: 'Done', icon: 'check' },
  question: { label: 'Question', icon: 'question' },
  help: { label: 'Help', icon: 'question' },
  faq: { label: 'FAQ', icon: 'question' },
  warning: { label: 'Warning', icon: 'warning' },
  caution: { label: 'Caution', icon: 'warning' },
  attention: { label: 'Attention', icon: 'warning' },
  failure: { label: 'Failure', icon: 'cross' },
  fail: { label: 'Fail', icon: 'cross' },
  missing: { label: 'Missing', icon: 'cross' },
  danger: { label: 'Danger', icon: 'zap' },
  error: { label: 'Error', icon: 'zap' },
  bug: { label: 'Bug', icon: 'bug' },
  example: { label: 'Example', icon: 'list' },
  quote: { label: 'Quote', icon: 'quote' },
  cite: { label: 'Cite', icon: 'quote' }
}

const DEFAULT_TYPE: CalloutType = CALLOUT_TYPES.note

/** `[!type]`, an optional fold marker, then an optional title on the same line. */
const CALLOUT_HEAD = /^\[!([^\]\s]+)\]([+-])?[ \t]*(.*)$/

/** Consecutive `>`-prefixed lines. Lazy continuation is deliberately not accepted. */
const QUOTE_BLOCK = /^(?: {0,3}>[^\n]*(?:\n|$))+/

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])
}

/** Type names reach CSS through `data-callout`, so keep them to safe characters. */
function normalizeName(raw: string) {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, '')
}

function renderIcon(icon: keyof typeof ICONS) {
  return (
    '<svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" ' +
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    ICONS[icon] +
    '</svg>'
  )
}

interface CalloutToken extends Tokens.Generic {
  type: 'callout'
  raw: string
  name: string
  fold: '' | '+' | '-'
  titleTokens: Token[]
  tokens: Token[]
}

export function markedCallouts(): MarkedExtension {
  return {
    extensions: [
      {
        name: 'callout',
        level: 'block',
        childTokens: ['titleTokens', 'tokens'],

        start(src: string) {
          return src.match(/^ {0,3}> *\[!/m)?.index
        },

        tokenizer(src: string): CalloutToken | undefined {
          const block = QUOTE_BLOCK.exec(src)
          if (!block) return undefined

          const raw = block[0]
          const text = raw.replace(/^ {0,3}> ?/gm, '')
          const [firstLine, ...rest] = text.split('\n')

          const head = CALLOUT_HEAD.exec(firstLine.trim())
          // Not a callout, so fall through to marked's own blockquote tokenizer and
          // leave ordinary quotes exactly as they were.
          if (!head) return undefined

          const name = normalizeName(head[1])
          const title = head[3].trim() || (CALLOUT_TYPES[name] ?? DEFAULT_TYPE).label

          return {
            type: 'callout',
            raw,
            name,
            fold: (head[2] ?? '') as '' | '+' | '-',
            titleTokens: this.lexer.inlineTokens(title),
            tokens: this.lexer.blockTokens(rest.join('\n'), [])
          }
        },

        renderer(token) {
          const { name, fold, titleTokens, tokens } = token as CalloutToken
          const type = CALLOUT_TYPES[name] ?? DEFAULT_TYPE

          const title = this.parser.parseInline(titleTokens)
          const body = this.parser.parse(tokens)
          const attrs = 'class="callout" data-callout="' + escapeHtml(name || 'note') + '"'
          const heading = renderIcon(type.icon) + '<span class="callout-label">' + title + '</span>'

          // `-` starts collapsed, `+` starts open; both are real disclosure widgets,
          // so folding keeps working with JavaScript off.
          if (fold) {
            return (
              '<details ' +
              attrs +
              (fold === '+' ? ' open' : '') +
              '><summary class="callout-title">' +
              heading +
              '</summary><div class="callout-content">' +
              body +
              '</div></details>\n'
            )
          }

          return (
            '<div ' +
            attrs +
            '><div class="callout-title">' +
            heading +
            '</div><div class="callout-content">' +
            body +
            '</div></div>\n'
          )
        }
      }
    ]
  }
}
