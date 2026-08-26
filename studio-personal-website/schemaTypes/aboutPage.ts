import {defineType, defineField} from 'sanity'

/**
 * Singleton: the prose at the top of /about.
 * Edited in place - there is only ever one of these documents.
 */
export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About Page',
  type: 'document',
  fields: [
    defineField({
      name: 'heading',
      title: 'Page heading',
      type: 'string',
      initialValue: 'About',
      validation: r => r.required()
    }),

    defineField({
      name: 'body',
      title: 'Body',
      type: 'markdown',
      description: 'The intro prose. Markdown - headings, links and emphasis all work.'
    }),

    defineField({
      name: 'bookshelfHeading',
      title: 'Bookshelf heading',
      type: 'string',
      initialValue: 'Bookshelf',
      description: 'Leave blank to hide the Bookshelf section entirely.'
    }),

    defineField({
      name: 'bookshelfIntro',
      title: 'Bookshelf intro',
      type: 'text',
      rows: 2,
      description: 'Optional line shown under the Bookshelf heading.'
    })
  ],
  preview: {
    prepare: () => ({title: 'About Page'})
  }
})
