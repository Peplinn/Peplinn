/**
 * Plays the GIF-replacement clips rendered by `renderVideo` in lib/markdown.ts.
 *
 * Those videos are `preload="none"` with no `autoplay`, so the page downloads
 * nothing for them up front. Each one starts only as it nears the viewport and
 * pauses once it leaves, so a post with several clips never streams more than
 * the ones being looked at.
 */
const videos = document.querySelectorAll<HTMLVideoElement>('video[data-lazy-video]')

if (videos.length) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reducedMotion) {
    // No looping motion the reader didn't ask for: show the first frame and controls.
    videos.forEach((video) => {
      video.controls = true
      video.preload = 'metadata'
    })
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement
          if (entry.isIntersecting) {
            // play() rejects if the browser blocks autoplay; the clip then just
            // stays still, so give the reader controls to start it themselves.
            video.play().catch(() => (video.controls = true))
          } else {
            video.pause()
          }
        }
      },
      // Start a little before the clip scrolls in, so it is already moving on arrival.
      { rootMargin: '200px 0px' }
    )
    videos.forEach((video) => observer.observe(video))
  }
}
