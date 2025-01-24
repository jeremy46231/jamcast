import { createAudioResponse } from '$lib/stream'
import type { RequestHandler } from '@sveltejs/kit'

export const GET: RequestHandler = () => {
  return createAudioResponse()
}
