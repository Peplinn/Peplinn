// schemas/blogPost.ts
// schemas/blogPost.ts
import {defineType, defineField} from 'sanity'
import {baseContentFields} from './fields/baseContent'

export const blogPost = defineType({
  name: 'blogPost',
  title: 'Blog Post',
  type: 'document',
  fields: [
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
      of: [{type: 'string'}]
    })
  ]
})
