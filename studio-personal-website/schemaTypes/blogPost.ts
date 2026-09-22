// schemas/blogPost.ts
// schemas/blogPost.ts
import {defineType, defineField} from 'sanity'
import {baseContentFields} from './fields/baseContent'

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
