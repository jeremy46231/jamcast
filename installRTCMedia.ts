import { MediaDevicesPolyfill } from './mediaDevices.ts'
import { webRTCConnect } from './webrtc.ts'

if (!('navigator' in globalThis))
  throw new Error('This file can only be run in a browser context')

const polyfill = new MediaDevicesPolyfill()

const streamCallbacks = webRTCConnect()
streamCallbacks.add((stream) => {
  polyfill._setStream(stream)
})

Object.defineProperty(navigator, 'mediaDevices', {
  value: polyfill,
  writable: false,
  enumerable: true,
  configurable: false,
})

console.log(
  '[jamcast] RTC media polyfill installed:',
  navigator.mediaDevices,
  location.href
)
