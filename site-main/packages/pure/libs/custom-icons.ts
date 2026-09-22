/**
 * Plotted marks - this site's own icons.
 *
 * Every mark is a small statistical graphic built from grid-snapped bars, and
 * meaning is carried by the silhouette of the top edge rather than by pictorial
 * detail. A histogram is both a data object and pixel art, which is what lets one
 * idea serve both halves of the brief.
 *
 * The grammar, which anything added here must follow:
 *
 *   canvas       24x24 (fixed by Icon.astro, which supplies the viewBox)
 *   cell         2x2 units, giving a 12x12 cell grid
 *   live area    x/y 2 -> 22, matching mingcute's ~20x20 optical area so these
 *                sit at the same weight as the borrowed icons beside them
 *   baseline     y = 20 for bar forms; a shared baseline is what makes the set
 *                read as one family
 *   min feature  1 cell (2 units), equal to mingcute's effective stroke weight
 *   corner       rx="0.5" - square at 14px where you want square, visibly
 *                softened at 80px where it echoes the card radius ladder
 *   colour       fill="currentColor" only, so marks inherit
 *                text-muted-foreground -> hover:text-primary for free
 *
 * Draw each contiguous block as ONE rect, never as a string of single cells -
 * otherwise every cell rounds its own corners and a bar reads as a stack of beads.
 *
 * Entries are raw SVG *inner* markup, with no wrapper and no viewBox. They must
 * also survive being pasted into a hand-built template string, as
 * ThemeProvider.astro does.
 */
export const CustomIcons = {
  /** Five bars, varied heights: a distribution. The longest form. */
  article:
    '<g fill="currentColor"><rect x="3" y="16" width="2" height="4" rx="0.5"/><rect x="7" y="12" width="2" height="8" rx="0.5"/><rect x="11" y="6" width="2" height="14" rx="0.5"/><rect x="15" y="10" width="2" height="10" rx="0.5"/><rect x="19" y="14" width="2" height="6" rx="0.5"/></g>',

  /** Four contiguous ascending steps: a progression, to be followed in order. */
  guide:
    '<g fill="currentColor"><rect x="4" y="16" width="4" height="4" rx="0.5"/><rect x="8" y="12" width="4" height="8" rx="0.5"/><rect x="12" y="8" width="4" height="12" rx="0.5"/><rect x="16" y="4" width="4" height="16" rx="0.5"/></g>',

  /** One rise: a single step out of a sequence. */
  'guide-step':
    '<g fill="currentColor"><rect x="6" y="14" width="6" height="6" rx="0.5"/><rect x="12" y="8" width="6" height="12" rx="0.5"/></g>',

  /**
   * A single square, floating clear of the baseline - a scatter point rather than
   * a measurement. The off-baseline position is what makes it unmistakable at
   * 14px against the bar forms.
   */
  note: '<rect x="9" y="9" width="6" height="6" rx="0.5" fill="currentColor"/>',

  /**
   * Horizontal bars, descending: a series of issues. Rotated 90 degrees from the
   * writing marks so a section marker doesn't compete with them.
   */
  newsletter:
    '<g fill="currentColor"><rect x="4" y="6" width="16" height="2" rx="0.5"/><rect x="4" y="10" width="12" height="2" rx="0.5"/><rect x="4" y="14" width="8" height="2" rx="0.5"/></g>'
}
