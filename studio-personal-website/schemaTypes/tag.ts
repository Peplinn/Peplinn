import {defineType, defineField} from 'sanity'

/**
 * Tags are documents rather than free text so posts pick from a dropdown of
 * existing tags - while still allowing a new one to be created inline from the
 * same field. Keeps the tag list consistent instead of accumulating typos.
 */
export const tag = defineType({
  name: 'tag',
  title: 'Tag',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Shown on the site and used in the /tags/<title> URL.',
      validation: r => r.required()
    })
  ],
  preview: {
    select: {title: 'title'}
  }
})
