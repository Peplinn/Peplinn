import {defineType, defineField} from 'sanity'
import {baseContentFields} from './fields/baseContent'

/**
 * One issue of the newsletter, written here and rendered at /newsletter/<slug>.
 *
 * Only the content lives in Sanity. The subscriber list lives in Resend, which
 * also owns unsubscribe links, suppression and bounces - none of which belong
 * in a CMS.
 */
export const newsletterIssue = defineType({
  name: 'newsletterIssue',
  title: 'Newsletter issue',
  type: 'document',
  fields: [
    ...baseContentFields,

    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: r => r.required()
    }),

    // Recorded by hand after sending from Resend. The site does not send mail,
    // so nothing can set this automatically - it is a note to self about which
    // issues have actually gone out.
    defineField({
      name: 'sentAt',
      title: 'Emailed on',
      type: 'datetime',
      description: 'Set this once the issue has been sent as a Resend broadcast.'
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
    select: {title: 'title', subtitle: 'publishedAt', sentAt: 'sentAt'},
    prepare: ({title, subtitle, sentAt}) => ({
      title,
      subtitle: `${subtitle ? new Date(subtitle).toLocaleDateString() : 'Unpublished'}${
        sentAt ? ' · sent' : ' · not sent'
      }`
    })
  }
})
