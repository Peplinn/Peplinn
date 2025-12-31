import {defineField} from 'sanity'

export const baseContentFields = [
  defineField({
    name: 'title',
    type: 'string',
    validation: r => r.required()
  }),
  defineField({
    name: 'slug',
    type: 'slug',
    options: {source: 'title'},
    validation: r => r.required()
  }),
  defineField({
    name: 'description',
    type: 'text'
  }),
  defineField({
    name: 'content',
    type: 'markdown'
  })
]
