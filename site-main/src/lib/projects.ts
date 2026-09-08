import type { ProjectCollectionItem } from './sanity'

/** Where the grouped Visualizations card and its listing live. */
export const VISUALIZATIONS_HREF = '/projects/visualizations'

export const VISUALIZATIONS_TITLE = 'Visualizations'

export const VISUALIZATIONS_DESCRIPTION = 'Charts and maps made in Python/R and Tableau.'

/** Shape consumed by `ProjectSection`. */
export type ProjectCardProps = {
  name: string
  description: string
  href?: string
  meta?: string
  image?: ProjectCollectionItem['data']['image']
  links?: { type: string; href: string }[]
  lightbox?: {
    src: string
    alt: string
    title: string
    description: string
    github?: string
  }
}

export function isVisualization(project: ProjectCollectionItem): boolean {
  return project.data.type === 'visualization'
}

/** Maps a single project document onto a card with its outbound links. */
export function toProjectCard(project: ProjectCollectionItem): ProjectCardProps {
  const { title, description, image, github, liveSite } = project.data
  return {
    name: title,
    description,
    image,
    links: [
      github && { type: 'github', href: github },
      liveSite && { type: 'site', href: liveSite }
    ].filter((link): link is { type: string; href: string } => Boolean(link))
  }
}

/**
 * A visualization card that opens the piece itself rather than linking away. The
 * GitHub link stays on the card, so the repository is still one click from here.
 */
export function toVisualizationCard(project: ProjectCollectionItem): ProjectCardProps {
  const card = toProjectCard(project)
  const image = project.data.image
  if (!image?.full) return card

  return {
    ...card,
    lightbox: {
      src: image.full,
      alt: image.alt,
      title: project.data.title,
      description: project.data.description,
      github: project.data.github
    }
  }
}

/**
 * The one card that stands in for every visualization. Borrows the newest
 * visualization's image so the card is never blank, and links to the listing
 * rather than to any single piece.
 */
export function toVisualizationsCard(visualizations: ProjectCollectionItem[]): ProjectCardProps {
  // const count = visualizations.length
  return {
    name: VISUALIZATIONS_TITLE,
    description: VISUALIZATIONS_DESCRIPTION,
    href: VISUALIZATIONS_HREF,
    // meta: count === 1 ? '1 piece' : `${count} pieces`,
    // The newest cover stands in for the group, so its alt text is replaced - the
    // card is about the collection, not that one piece.
    image: (() => {
      const image = visualizations.find((project) => project.data.image)?.data.image
      return image && { ...image, alt: VISUALIZATIONS_TITLE }
    })()
  }
}

/**
 * Splits projects into the cards shown on an index: the grouped Visualizations
 * card first (omitted when there are none), then every non-visualization project.
 */
export function buildProjectCards(projects: ProjectCollectionItem[]): ProjectCardProps[] {
  const visualizations = projects.filter(isVisualization)
  const programs = projects.filter((project) => !isVisualization(project))

  return [
    ...(visualizations.length > 0 ? [toVisualizationsCard(visualizations)] : []),
    ...programs.map(toProjectCard)
  ]
}
