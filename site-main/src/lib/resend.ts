import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Resend holds the subscriber list; Sanity holds the issues.
 *
 * The split is deliberate. Subscriber emails are personal data and the Sanity
 * dataset is public-read - anyone can query it unauthenticated - so the list
 * cannot live there. Resend also owns the parts that are genuinely hard to get
 * right: unsubscribe links, suppression, bounces and deliverability.
 *
 * Signup is double opt-in. Resend's Contacts API sends nothing on its own, so
 * the confirmation mail is ours to send, and a contact stays `unsubscribed`
 * until the link is clicked. That keeps typo'd and maliciously-entered
 * addresses off the list, which matters most while a new sending domain is
 * still building reputation.
 *
 * The API key must never reach the browser. Nothing here is safe to import into
 * client-side code; the form goes through `/api/subscribe`.
 */

const API = 'https://api.resend.com'

/** A pending confirmation is worth little after a week. */
const CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000

function readEnv(key: string): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[key] : undefined
  return fromProcess ?? (import.meta.env as Record<string, string | undefined>)[key]
}

export function resendConfigured(): boolean {
  return Boolean(readEnv('RESEND_API_KEY'))
}

/** Verified sending identity. Must be on a domain verified in Resend. */
function sender(): string {
  return readEnv('NEWSLETTER_FROM') ?? 'Ebube <ebube@newsletter.ebubeoluoma.com>'
}

async function api(path: string, init: RequestInit): Promise<Response | null> {
  const key = readEnv('RESEND_API_KEY')
  if (!key) return null

  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    }
  })
}

/* -------------------------------------------------------------------------- */
/* Confirmation tokens                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The API key doubles as the signing secret, so there is no second credential
 * to configure or keep in sync. Rotating the key invalidates pending
 * confirmation links, which is acceptable - they expire anyway - and anyone who
 * has the key can already send mail as you, so it grants no new capability.
 */
function sign(email: string, expiresAt: number): string {
  const key = readEnv('RESEND_API_KEY') ?? ''
  return createHmac('sha256', key).update(`${email}:${expiresAt}`).digest('base64url')
}

export function confirmationLink(origin: string, email: string): string {
  const expiresAt = Date.now() + CONFIRM_TTL_MS
  const params = new URLSearchParams({
    email,
    exp: String(expiresAt),
    token: sign(email, expiresAt)
  })
  return `${origin}/newsletter/confirm?${params}`
}

export type ConfirmOutcome = 'confirmed' | 'expired' | 'invalid'

export async function confirm(
  email: string,
  expiresAt: string,
  token: string
): Promise<ConfirmOutcome> {
  const exp = Number(expiresAt)
  if (!email || !token || !Number.isFinite(exp)) return 'invalid'

  const expected = Buffer.from(sign(email, exp))
  const given = Buffer.from(token)
  // Compare in constant time, and only once the lengths match - `timingSafeEqual`
  // throws on a length mismatch rather than returning false.
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return 'invalid'

  // Checked after the signature, so an expired-but-unsigned guess can't be used
  // to probe which addresses are pending.
  if (exp < Date.now()) return 'expired'

  const response = await api(`/contacts/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    body: JSON.stringify({ unsubscribed: false })
  })

  if (!response?.ok) {
    console.error(`Resend confirm responded ${response?.status ?? 'no client'}`)
    return 'invalid'
  }

  return 'confirmed'
}

/* -------------------------------------------------------------------------- */
/* Signup                                                                      */
/* -------------------------------------------------------------------------- */

export type SubscribeResult = { ok: true } | { ok: false; message: string }

const GENERIC_FAILURE = 'Something went wrong. Please try again.'

/** Server-side only. Called from `/api/subscribe`, never from the browser. */
export async function subscribe(email: string, origin: string): Promise<SubscribeResult> {
  if (!resendConfigured()) return { ok: false, message: 'The newsletter is not set up yet.' }

  // Created unsubscribed: the contact exists so it can be flipped on confirm,
  // but Broadcasts skip it until then, so an unconfirmed address is never mailed.
  const created = await api('/contacts', {
    method: 'POST',
    body: JSON.stringify({ email, unsubscribed: true })
  })

  // 409 means they're already a contact - either confirmed, or they signed up
  // before and never clicked. Re-sending the link covers the second case, and
  // the first is harmless.
  if (!created?.ok && created?.status !== 409) {
    console.error(`Resend contacts responded ${created?.status ?? 'no client'}`)
    return { ok: false, message: GENERIC_FAILURE }
  }

  const link = confirmationLink(origin, email)

  const sent = await api('/emails', {
    method: 'POST',
    body: JSON.stringify({
      from: sender(),
      to: [email],
      subject: 'Confirm your subscription',
      text: `Thanks for signing up. Confirm your subscription by opening this link:\n\n${link}\n\nIf you didn't request this, ignore this email - you won't be subscribed.`,
      html: `<p>Thanks for signing up. Confirm your subscription:</p><p><a href="${link}">Confirm subscription</a></p><p>If you didn't request this, ignore this email — you won't be subscribed.</p>`
    })
  })

  if (!sent?.ok) {
    console.error(`Resend send responded ${sent?.status ?? 'no client'}`)
    return { ok: false, message: GENERIC_FAILURE }
  }

  return { ok: true }
}
