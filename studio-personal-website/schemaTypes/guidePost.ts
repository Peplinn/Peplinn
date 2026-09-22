import {defineType} from 'sanity'
import {baseContentFields} from './fields/baseContent'

/**
 * One step of a guide. Deliberately minimal - title, slug, description, content
 * - and deliberately has no `guide` reference back to its parent: the guide
 * holds an ordered array of references down to its steps, so a step's position
 * is read off that array rather than stored on the step itself. See guide.ts for
 * why parent-points-down was the choice.
 *
 * A step is never listed on its own - only reachable through the guide that
 * references it, at /guides/<guide>/<step>.
 */
export const guidePost = defineType({
  name: 'guidePost',
  title: 'Guide step',
  type: 'document',
  fields: [...baseContentFields],
  preview: {
    select: {title: 'title', subtitle: 'description'}
  }
})
