import { nanoid } from 'nanoid'
import GstWebRTCAPI from './gst-plugins-rs/net/webrtc/gstwebrtc-api/src/gstwebrtc-api.js'
export type { GstWebRTCAPI }

const streamCallbacks = new Set<(stream: MediaStream | null) => void>()
let api: GstWebRTCAPI

export function webRTCConnect() {
  if (!('window' in globalThis))
    throw new Error('This function can only be called in a browser context')
  if (api) return streamCallbacks

  const id = nanoid() // Unique ID for the client
  api = new GstWebRTCAPI({
    signalingServerUrl: `wss://jamcast-signalling.jer.app`,
    meta: {
      name: `browser-client-${id}`,
    },
  })

  type producer = {
    id: string
    meta: Record<string, unknown>
  }

  let currentProducerID: string | undefined
  function findStream() {
    const producers = api.getAvailableProducers() as producer[]
    const producerID =
      currentProducerID && producers.some((p) => p.id === currentProducerID)
        ? currentProducerID
        : producers.find((p) => p.meta.name === 'jamcast-stream')?.id

    if (!producerID || currentProducerID === producerID) return

    currentProducerID = producerID
    connectToProducer(producerID)
  }

  let currentSession: any | undefined
  function connectToProducer(id: string) {
    console.log('Connecting to producer:', id)
    if (currentSession) {
      currentSession.close()
    }
    const session = api.createConsumerSession(id) // Create a new consumer
    console.log('WebRTC session created:', session)

    session.addEventListener(
      'error',
      (error: { message: unknown; error: unknown }) => {
        console.error('WebRTC session error:', error.message, error.error)
      }
    )
    session.addEventListener('closed', () => {
      console.log('WebRTC session closed')
      currentSession = undefined
      streamCallback(null)
    })
    session.addEventListener('streamsChanged', () => {
      console.log('WebRTC session stream connected')
      const streams = session.streams as MediaStream[]
      if (streams.length > 1) {
        console.warn('Unexpected number of streams:', streams.length)
      }
      const stream = streams[0]
      streamCallback(stream)
    })
    session.connect()
    currentSession = session
  }

  api.registerProducersListener({
    producerAdded: (producer: producer) => {
      console.log('Producer added:', producer)
      findStream()
    },
    producerRemoved: (producer: producer) => {
      console.log('Producer removed:', producer)
      findStream()
    },
  })
  findStream()

  const audioElement = new Audio()
  // audioElement.autoplay = true
  audioElement.muted = true
  // audioElement.controls = true
  // document.body.insertBefore(audioElement, document.body.firstChild)

  function streamCallback(stream: MediaStream | null) {
    if (stream) audioElement.srcObject = stream
    streamCallbacks.forEach((callback) => callback(stream))
    ;(globalThis as any)['currentWebRTCStream'] = stream
  }

  return streamCallbacks
}

if ('document' in globalThis) {
  let testStream: MediaStream | null = null
  streamCallbacks.add((stream) => {
    testStream = stream
  })
  setInterval(async () => {
    const stream = testStream
    if (!stream) return

    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    source.connect(analyser)

    analyser.fftSize = 256
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const volumeArray: number[] = []

    for (let i = 0; i < 10; i++) {
      analyser.getByteFrequencyData(dataArray)

      // Calculate the average volume level from the frequency data
      let total = 0
      for (let i = 0; i < bufferLength; i++) {
        total += dataArray[i]
      }

      const averageVolume = total / bufferLength
      volumeArray.push(averageVolume)

      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    console.log('[jamcast]', 'Volume Array:', volumeArray.join(', '))
    await audioContext.close()
  }, 2000)
}
