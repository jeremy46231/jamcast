import * as esbuild from 'esbuild'
import fs from 'fs/promises'
import type { Browser, Page } from 'puppeteer'

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

let cachedRTCBundle: string | null = null
export async function getRTCBundle() {
  if (cachedRTCBundle) return cachedRTCBundle
  const result = await esbuild.build({
    entryPoints: ['installRTCMedia.ts'],
    bundle: true,
    write: false,
  })
  const bundle = result.outputFiles[0].text
  cachedRTCBundle = bundle
  fs.writeFile('temp.bundle.js', bundle)
  return bundle
}
