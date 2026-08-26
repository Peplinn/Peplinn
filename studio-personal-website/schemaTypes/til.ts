import {defineType, defineField} from 'sanity'

/** "Today I Learned" - a short, dated note rendered on the /til timeline. */
export const til = defineType({
  name: 'til',
  title: 'TIL',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: r => r.required()
    }),

    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: r => r.required()
    }),

    defineField({
      name: 'content',
      title: 'Content',
      type: 'markdown',
      description: 'Keep it brief - roughly 250 words.',
      validation: r =>
        r.custom(value => {
          if (!value) return true
          const words = String(value).trim().split(/\s+/).filter(Boolean).length
          return words > 300 ? `That is ${words} words - TILs read best under ~250.` : true
        }).warning()
    }),

    defineField({
      name: 'tags',
      type: 'array',
      of: [{type: 'string'}],
      options: {layout: 'tags'}
    })
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}]
    }
  ],
  preview: {
    select: {title: 'title', subtitle: 'publishedAt'},
    prepare: ({title, subtitle}) => ({
      title,
      subtitle: subtitle ? new Date(subtitle).toLocaleDateString() : 'Unpublished'
    })
  }
})
