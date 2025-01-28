import { MediaDevicesPolyfill } from './mediaDevices.ts'
import { webRTCConnect } from './webrtc.ts'

if (!('navigator' in globalThis))
  throw new Error('This file can only be run in a browser context')

const polyfill = new MediaDevicesPolyfill()

// const audioElement = document.createElement('audio')
// audioElement.autoplay = true
// // audioElement.muted = true
// audioElement.controls = true
// audioElement.style.position = 'fixed'
// audioElement.style.bottom = '0'
// audioElement.style.right = '0'
// audioElement.style.width = '200px'
// audioElement.style.height = 'auto'
// audioElement.style.zIndex = '9999'
// document.body.insertBefore(audioElement, document.body.firstChild)

const streamCallbacks = webRTCConnect()
streamCallbacks.add((stream) => {
  polyfill._setStream(stream)
  // audioElement.srcObject = stream
})

// const audio = new Audio()
// audio.autoplay = true
// audio.controls = true
// audio.style.position = 'fixed'
// audio.style.bottom = '0'
// audio.style.right = '0'
// audio.style.width = '200px'
// audio.style.height = 'auto'
// audio.style.zIndex = '9999'
// document.body.insertBefore(audio, document.body.firstChild)

// audio.src = 'http://http://129.146.216.190:46231/audio.mp3'

// const stream = audio.captureStream() as MediaStream
// polyfill._setStream(stream)

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
