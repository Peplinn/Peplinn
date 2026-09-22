import {defineType, defineField} from 'sanity'
import {baseContentFields} from './fields/baseContent'

/** One issue of the newsletter, rendered at /newsletter/<slug>. */
export const newsletterIssue = defineType({
  name: 'newsletterIssue',
  title: 'Newsletter issue',
  type: 'document',
  fields: [
    ...baseContentFields,

    defineField({
      name: 'publishedAt',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: r => r.required()
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
