import {essay} from './essay'
import {blogPost} from './blogPost'
import {project} from './project'
import {aboutPage} from './aboutPage'
import {nowPage} from './nowPage'
import {book} from './book'
import {til} from './til'
import {tag} from './tag'

export const schemaTypes = [essay, blogPost, project, aboutPage, nowPage, book, til, tag]

/** Types that must only ever have one document, pinned in the studio sidebar. */
export const singletonTypes = ['aboutPage', 'nowPage']
