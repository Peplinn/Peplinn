import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes, singletonTypes} from './schemaTypes'
import {structure} from './structure'
import { markdownSchema } from 'sanity-plugin-markdown'

export default defineConfig({
  name: 'default',
  title: 'Personal Website',

  projectId: 'yry247aj',
  dataset: 'production',

  plugins: [structureTool({structure}), visionTool(), markdownSchema()],

  schema: {
    types: schemaTypes,
    templates: prev => prev.filter(t => !singletonTypes.includes(t.schemaType)),
  },

  document: {
    productionUrl: async (prev, context) => {
      const { document } = context
      
      // Safely check if the document exists and has a valid slug populated
      const slug = (document?.slug as any)?.current
      if (!slug) return prev

      // Smart environment switching:
      // If you are running Sanity Studio locally, it points to localhost Astro.
      // Otherwise, it points to your live deployment.
      const baseUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:4321'
        : 'https://ebubeoluoma.com' 

      // If you are writing a post, redirect it to your new dynamic Astro preview route
      if (document._type === 'blogPost') {
        return `${baseUrl}/preview/${slug}`
      }

      return prev
    },
  },
})
