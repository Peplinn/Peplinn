// schemas/blogPost.ts
// schemas/blogPost.ts
import {defineType, defineField} from 'sanity'
import {baseContentFields} from './fields/baseContent'
import {MEDIA_BUDGET, formatMB} from '../lib/mediaBudget'

export const blogPost = defineType({
  name: 'blogPost',
  title: 'Blog Post',
  type: 'document',
  fields: [
    // First, deliberately: this has to sit above `content`, because the markdown
    // editor is full-height and anything after it is effectively invisible.
    //
    // Presentation tier, not structure. Guides are a separate document type
    // because they carry ordered children and live under their own URL - folding
    // them in here would mean a conditional field, and Sanity keeps the data in
    // hidden fields, so reclassifying a guide would silently orphan its steps.
    defineField({
      name: 'type',
      title: 'Kind of writing',
      type: 'string',
      description:
        'Decides how prominently this is presented on the writing page. Articles get the full card treatment; notes are a single line.',
      initialValue: 'article',
      options: {
        list: [
          {title: 'Article - a long-form piece', value: 'article'},
          {title: 'Note - a short, personal one', value: 'note'}
        ],
        layout: 'radio'
      },
      validation: r => r.required()
    }),

    ...baseContentFields,

    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      options: {
        hotspot: true
      },
      // The hero is the first thing every visit downloads. Photos are resized by
      // the site, but a GIF is served as uploaded, so its size is checked here.
      validation: (rule) =>
        rule.custom(async (value, context) => {
          const ref = (value as {asset?: {_ref?: string}} | undefined)?.asset?._ref
          if (!ref?.endsWith('-gif')) return true
          const size = await context
            .getClient({apiVersion: '2024-01-01'})
            .fetch<number | null>('*[_id == $ref][0].size', {ref})
          if (!size || size <= MEDIA_BUDGET.heroGif) return true
          return `This GIF is ${formatMB(size)}; hero GIFs are capped at ${formatMB(MEDIA_BUDGET.heroGif)} because the site cannot shrink them. Use a still image, or a smaller GIF.`
        }),
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt text'
        },
        {
          name: 'color',
          type: 'string',
          title: 'Primary color'
        }
      ]
    }),

    // A separate field because Sanity's image type only stores images - there is
    // no way to make `heroImage` accept a video file.
    defineField({
      name: 'heroVideo',
      title: 'Hero video',
      type: 'file',
      description:
        'Optional MP4 or WebM that plays, silent and looping, in place of the hero image. Keep the hero image too: it shows while the video loads, and in post lists and link previews, which cannot play video.',
      options: {accept: 'video/mp4,video/webm'},
      validation: (rule) => [
        rule.custom(async (value, context) => {
          const ref = (value as {asset?: {_ref?: string}} | undefined)?.asset?._ref
          if (!ref) return true
          const size = await context
            .getClient({apiVersion: '2024-01-01'})
            .fetch<number | null>('*[_id == $ref][0].size', {ref})
          if (!size || size <= MEDIA_BUDGET.heroVideo) return true
          return `This video is ${formatMB(size)}; hero videos are capped at ${formatMB(MEDIA_BUDGET.heroVideo)} because every visit streams it. Shorten it or lower its resolution.`
        }),
        rule
          .custom((value, context) => {
            const doc = context.document as {heroImage?: {asset?: unknown}} | undefined
            if (!(value as {asset?: unknown} | undefined)?.asset || doc?.heroImage?.asset) return true
            return 'Add a hero image as well - without one the post has no thumbnail in lists or link previews, and the hero is blank until the video loads.'
          })
          .warning()
      ]
    }),

    defineField({
      name: 'publishedAt',
      type: 'datetime',
      validation: r => r.required()
    }),

    defineField({
      name: 'tags',
      type: 'array',
      description: 'Pick from existing tags, or create a new one from the same field.',
      of: [{type: 'reference', to: [{type: 'tag'}]}]
    })
  ]
})
