import type {StructureResolver} from 'sanity/structure'
import {singletonTypes} from './schemaTypes'

/**
 * Pins the single-document types to the top of the studio and hides them from the
 * generic type list, so there is exactly one About and one Now document to edit.
 */
export const structure: StructureResolver = S =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('About Page')
        .id('aboutPage')
        .child(S.document().schemaType('aboutPage').documentId('aboutPage').title('About Page')),
      S.listItem()
        .title('Now Section')
        .id('nowPage')
        .child(S.document().schemaType('nowPage').documentId('nowPage').title('Now Section')),
      S.divider(),
      ...S.documentTypeListItems().filter(item => !singletonTypes.includes(item.getId()!))
    ])
