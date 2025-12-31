import {defineType, defineField} from 'sanity'
import {baseContentFields} from './fields/baseContent'

export const essay = defineType({
  name: 'essay',
  title: 'Essay',
  type: 'document',
  fields: [
    ...baseContentFields,

    defineField({
      name: 'category',
      type: 'string',
      validation: r => r.required()
    }),

    defineField({
      name: 'order',
      type: 'number'
    })
  ]
})
