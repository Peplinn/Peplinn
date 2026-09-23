import type { APIRoute } from 'astro'

import { subscribe } from '../../lib/resend'

export const prerender = false

/**
 * Stands between the form and Resend so the API key stays on the server.
 *
 * Accepts a normal form POST as well as JSON, so the form still works with
 * JavaScript disabled - in that case it redirects back with a status in the
 * query string rather than answering JSON.
 */
export const POST: APIRoute = async ({ request, redirect }) => {
  const contentType = request.headers.get('content-type') ?? ''
  const wantsJson = contentType.includes('application/json')

  let email = ''
  if (wantsJson) {
    const body = (await request.json().catch(() => ({}))) as { email?: string }
    email = (body.email ?? '').trim()
  } else {
    const form = await request.formData()
    email = String(form.get('email') ?? '').trim()
  }

  // Deliberately loose: Resend does the real validation, and a regex that
  // out-thinks it would only reject addresses that actually work.
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const result = looksLikeEmail
    ? await subscribe(email)
    : ({ ok: false, message: 'That does not look like an email address.' } as const)

  if (wantsJson) {
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return redirect(`/newsletter?subscribed=${result.ok ? 'yes' : 'no'}`, 303)
}
