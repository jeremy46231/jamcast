import { nanoid } from 'nanoid'
import GstWebRTCAPI from './gst-plugins-rs/net/webrtc/gstwebrtc-api/src/gstwebrtc-api.js'
export type { GstWebRTCAPI }

export const streamCallbacks = new Set<(stream: MediaStream | null) => void>()
let api: GstWebRTCAPI

export function connect() {
  if (!('window' in globalThis)) return
  if (api) return streamCallbacks
  
  const id = nanoid() // Unique ID for the client
  api = new GstWebRTCAPI({
    signalingServerUrl: `ws://129.146.216.190:46232`,
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

  function streamCallback(stream: MediaStream | null) {
    streamCallbacks.forEach((callback) => callback(stream))
  }
  
  return streamCallbacks
}
