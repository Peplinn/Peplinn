import { defineType, defineField } from 'sanity'

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: r => r.required()
    }),

    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title' },
      validation: r => r.required()
    }),

    defineField({
      name: 'description',
      type: 'text'
    }),

    defineField({
      name: 'type',
      title: 'Project type',
      type: 'string',
      description:
        'Visualizations are grouped behind a single card on the site; programs get their own card.',
      initialValue: 'visualization',
      options: {
        list: [
          { title: 'Visualization', value: 'visualization' },
          { title: 'Program', value: 'program' }
        ],
        layout: 'radio'
      }
    }),

    defineField({
      name: 'image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        { name: 'alt', type: 'string', title: 'Alt text' },
        { name: 'color', type: 'string', title: 'Primary color' }
      ]
    }),

    defineField({
      name: 'github',
      type: 'url'
    }),

    defineField({
      name: 'liveSite',
      type: 'url'
    }),

    defineField({
      name: 'featured',
      type: 'boolean',
      initialValue: false
    }),

    defineField({
      name: 'publishedAt',
      type: 'datetime'
    })
  ]
})