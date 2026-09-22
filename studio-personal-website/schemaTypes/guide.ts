import {defineType, defineField} from 'sanity'
import {baseContentFields} from './fields/baseContent'

/**
 * A guide is an index document: a brief description of a topic followed by an
 * ordered list of steps. It is a separate document type rather than a third
 * `blogPost.type` value because it is structurally different - it has children
 * and lives under its own URL (/guides/<slug>) - not just presented differently.
 * Folding it into `blogPost` would need a field hidden unless `type === 'guide'`,
 * and Sanity keeps data in hidden fields, so reclassifying a guide later would
 * silently orphan its steps.
 */
export const guide = defineType({
  name: 'guide',
  title: 'Guide',
  type: 'document',
  fields: [
    ...baseContentFields,

    defineField({
      name: 'publishedAt',
      type: 'datetime',
      validation: r => r.required()
    }),

    defineField({
      name: 'tags',
      type: 'array',
      description: 'Pick from existing tags, or create a new one from the same field.',
      of: [{type: 'reference', to: [{type: 'tag'}]}]
    }),

    defineField({
      name: 'sections',
      title: 'Steps',
      type: 'array',
      description: 'The steps of the guide, in the order readers should follow them.',
      of: [{type: 'reference', to: [{type: 'guidePost'}]}],
      validation: r =>
        r.custom(async (sections, context) => {
          const refs = (sections ?? [])
            .map((s: {_ref?: string}) => s._ref)
            .filter((ref: unknown): ref is string => typeof ref === 'string')
          if (!refs.length) return true

          const client = context.getClient({apiVersion: '2024-01-01'})
          const currentId = (context.document?._id as string | undefined)?.replace(
            /^drafts\./,
            ''
          )

          // A step used by two guides breaks which guide "owns" its URL. This is
          // only a warning, not a hard error, since nothing on the site actually
          // enforces single ownership yet.
          const clashing: string[] = await client.fetch(
            `*[_type == "guide" && _id != $currentId && !(_id in path("drafts.**")) && count((sections[]._ref)[@ in $refs]) > 0].title`,
            {refs, currentId}
          )

          return clashing.length > 0
            ? `Already used in: ${clashing.join(', ')} - a step should belong to one guide.`
            : true
        }).warning()
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
    select: {title: 'title', steps: 'sections'},
    prepare: ({title, steps}) => ({
      title,
      subtitle: `${steps?.length ?? 0} step${steps?.length === 1 ? '' : 's'}`
    })
  }
})
