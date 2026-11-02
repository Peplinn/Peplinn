import {useMemo, useRef} from 'react'
import {useClient} from 'sanity'
import {MarkdownInput, type MarkdownInputProps} from 'sanity-plugin-markdown'

import {GIF_TO_VIDEO_HINT, MEDIA_BUDGET, formatMB} from '../lib/mediaBudget'

type EasyMDE = Parameters<
  NonNullable<NonNullable<MarkdownInputProps['reactMdeProps']>['getMdeInstance']>
>[0]

/** Reads a video's pixel size in the browser, before it is uploaded. */
function videoDimensions(file: File): Promise<{width: number; height: number} | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    const done = (result: {width: number; height: number} | null) => {
      URL.revokeObjectURL(url)
      resolve(result)
    }
    video.preload = 'metadata'
    video.onloadedmetadata = () =>
      done(video.videoWidth ? {width: video.videoWidth, height: video.videoHeight} : null)
    video.onerror = () => done(null)
    video.src = url
  })
}

/**
 * The markdown editor, with uploads that can't hurt page load.
 *
 * Dragging or pasting a file into the editor still uploads it to Sanity, but:
 *  - a video (MP4/WebM) is accepted and inserted as `![](….mp4#WxH)`, which the
 *    site renders as a lazy, silent loop - the GIF replacement. The `#WxH` lets
 *    the site reserve the right height before the video loads;
 *  - a GIF or video over the budget in lib/mediaBudget.ts is refused with a
 *    message saying why, instead of quietly making the post slow.
 *
 * Out of the box the editor uploads every file as an *image* asset, so videos
 * failed outright.
 */
export function CustomMarkdownInput(props: MarkdownInputProps) {
  const client = useClient({apiVersion: '2024-01-01'})
  const mde = useRef<EasyMDE | null>(null)
  const imageUrl = (props.schemaType.options as {imageUrl?: (asset: any) => string} | undefined)
    ?.imageUrl

  const reactMdeProps: MarkdownInputProps['reactMdeProps'] = useMemo(
    () => ({
      getMdeInstance: (instance) => {
        mde.current = instance
      },
      options: {
        imageAccept:
          'image/png, image/jpeg, image/gif, image/webp, image/avif, video/mp4, video/webm',
        imageUploadFunction: async (
          file: File,
          onSuccess: (url: string) => void,
          onError: (message: string) => void
        ) => {
          try {
            if (file.type.startsWith('video/')) {
              if (file.size > MEDIA_BUDGET.video) {
                return onError(
                  `${file.name} is ${formatMB(file.size)}; videos are capped at ${formatMB(MEDIA_BUDGET.video)}. ` +
                    'Shorten it, or re-encode with a higher -crf.'
                )
              }
              const dims = await videoDimensions(file)
              const asset = await client.assets.upload('file', file, {filename: file.name})
              const url = dims ? `${asset.url}#${dims.width}x${dims.height}` : asset.url
              // Inserted by hand: the editor's own success handler only writes
              // `![]()` for image extensions and turns anything else into a link.
              mde.current?.codemirror.replaceSelection(`![](${url})`)
              return
            }

            if (file.type === 'image/gif' && file.size > MEDIA_BUDGET.bodyGif) {
              return onError(
                `${file.name} is ${formatMB(file.size)}; GIFs are capped at ${formatMB(MEDIA_BUDGET.bodyGif)} ` +
                  `because the site cannot shrink them. ${GIF_TO_VIDEO_HINT}`
              )
            }

            const asset = await client.assets.upload('image', file, {filename: file.name})
            // Same URL the plugin produces by default, so existing behaviour holds.
            onSuccess(imageUrl ? imageUrl(asset) : `${asset.url}?w=450`)
          } catch (error) {
            console.error(error)
            onError(error instanceof Error ? error.message : String(error))
          }
        }
      }
    }),
    [client, imageUrl]
  )

  return <MarkdownInput {...props} reactMdeProps={reactMdeProps} />
}
