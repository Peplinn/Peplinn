import {defineType, defineField} from 'sanity'

/** One entry on the /about Bookshelf. */
export const book = defineType({
  name: 'book',
  title: 'Book',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: r => r.required()
    }),

    defineField({
      name: 'author',
      type: 'string'
    }),

    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      initialValue: 'reading',
      options: {
        list: [
          {title: 'Currently reading', value: 'reading'},
          {title: 'Finished', value: 'finished'},
          {title: 'Want to read', value: 'want'}
        ],
        layout: 'radio'
      },
      validation: r => r.required()
    }),

    defineField({
      name: 'note',
      title: 'Note',
      type: 'text',
      rows: 3,
      description: 'A sentence on what you made of it. Optional.'
    }),

    defineField({
      name: 'link',
      title: 'Link',
      type: 'url',
      description: 'Somewhere to read more about the book. Optional.'
    }),

    defineField({
      name: 'coverImage',
      title: 'Cover',
      type: 'image',
      options: {hotspot: true},
      fields: [{name: 'alt', type: 'string', title: 'Alt text'}]
    }),

    defineField({
      name: 'finishedAt',
      title: 'Finished on',
      type: 'datetime',
      description: 'Used to order finished books, most recent first.'
    })
  ],
  preview: {
    select: {title: 'title', subtitle: 'author', media: 'coverImage'}
  }
})
