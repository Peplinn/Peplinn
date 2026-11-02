/**
 * Size limits for uploads that the website cannot shrink.
 *
 * Ordinary images (JPEG, PNG, WebP...) have no limit here: the site asks Sanity
 * for a resized WebP at the width each screen needs, so a 6MB photo still
 * arrives at a few hundred KB. GIFs and videos are served as uploaded, so their
 * upload size IS what readers download. These numbers are the budget - raise or
 * lower them here and both the editor and the hero-image check follow.
 */
const MB = 1024 * 1024

export const MEDIA_BUDGET = {
  /** A GIF inside a post body. Anything bigger should be a video. */
  bodyGif: 1 * MB,
  /** A GIF hero. Lower than body GIFs: the hero loads first, on every visit. */
  heroGif: 0.5 * MB,
  /** A video inside a post body. Only fetched as it scrolls into view. */
  video: 5 * MB,
  /** A hero video. Lower than body videos: it starts streaming on every visit. */
  heroVideo: 2 * MB
} as const

export function formatMB(bytes: number): string {
  return `${(bytes / MB).toFixed(1)}MB`
}

export const GIF_TO_VIDEO_HINT =
  'Convert it to an MP4 and upload that instead - it will be a fraction of the size. ' +
  'With ffmpeg: ffmpeg -i in.gif -movflags +faststart -pix_fmt yuv420p ' +
  '-vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -crf 26 out.mp4'
