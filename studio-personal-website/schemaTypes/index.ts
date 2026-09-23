import {blogPost} from './blogPost'
import {guide} from './guide'
import {guidePost} from './guidePost'
import {newsletterIssue} from './newsletterIssue'
import {project} from './project'
import {aboutPage} from './aboutPage'
import {nowPage} from './nowPage'
import {book} from './book'
import {til} from './til'
import {tag} from './tag'

export const schemaTypes = [
  blogPost,
  guide,
  guidePost,
  newsletterIssue,
  project,
  aboutPage,
  nowPage,
  book,
  til,
  tag
]

/** Types that must only ever have one document, pinned in the studio sidebar. */
export const singletonTypes = ['aboutPage', 'nowPage']
