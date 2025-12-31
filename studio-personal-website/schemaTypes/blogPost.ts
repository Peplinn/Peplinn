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
