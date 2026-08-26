import {defineType, defineField} from 'sanity'

/**
 * Singleton: the "Now" section rendered at the bottom of /about.
 */
export const nowPage = defineType({
  name: 'nowPage',
  title: 'Now Section',
  type: 'document',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'Now',
      validation: r => r.required()
    }),

    defineField({
      name: 'body',
      title: 'Body',
      type: 'markdown',
      description: 'What you are up to right now.'
    }),

    defineField({
      name: 'updatedAt',
      title: 'Last updated',
      type: 'datetime',
      description: 'Shown under the heading so readers know how current this is.'
    })
  ],
  preview: {
    prepare: () => ({title: 'Now Section'})
  }
})
