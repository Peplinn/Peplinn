/**
 * Resend holds the subscriber list; Sanity holds the issues.
 *
 * The split is deliberate. Subscriber emails are personal data and the Sanity
 * dataset is public-read - anyone can query it unauthenticated - so the list
 * cannot live there. Resend also owns the parts that are genuinely hard to get
 * right: unsubscribe links, suppression, bounces and deliverability. Broadcasts
 * sent from Resend skip unsubscribed contacts automatically, so nothing here
 * has to maintain a suppression list.
 *
 * The API key must never reach the browser. Nothing in this module is safe to
 * import into client-side code; the form goes through `/api/subscribe`.
 */

const API = 'https://api.resend.com'

/**
 * Read at request time rather than build time. `import.meta.env` is inlined by
 * Vite, which would bake the key into the bundle; `process.env` is what the
 * serverless function actually sees.
 */
function readEnv(key: string): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[key] : undefined
  return fromProcess ?? (import.meta.env as Record<string, string | undefined>)[key]
}

/** True when the integration is configured, so the form can say so honestly. */
export function resendConfigured(): boolean {
  return Boolean(readEnv('RESEND_API_KEY'))
}

export type SubscribeResult = { ok: true } | { ok: false; message: string }

/** Server-side only. Called from `/api/subscribe`, never from the browser. */
export async function subscribe(email: string): Promise<SubscribeResult> {
  const key = readEnv('RESEND_API_KEY')
  if (!key) return { ok: false, message: 'The newsletter is not set up yet.' }

  const response = await fetch(`${API}/contacts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, unsubscribed: false })
  })

  if (response.ok) return { ok: true }

  // Re-subscribing an existing address is a success as far as the reader is
  // concerned - telling them they're already on the list invites them to try
  // again with a different address, and leaks who is subscribed.
  if (response.status === 409) return { ok: true }

  console.error(`Resend contacts responded ${response.status}`)
  return { ok: false, message: 'Something went wrong. Please try again.' }
}
