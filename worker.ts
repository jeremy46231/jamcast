// Runs on Cloudflare Workers to proxy WebSocket connections because we need HTTPS (wss://) on secure origins

export default {
  async fetch(request, env, ctx) {
    const upgradeHeader = request.headers.get('Upgrade')
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 })
    }

    const client = await new Promise(async (resolve, reject) => {
      // Create a WebSocketPair
      const webSocketPair = new WebSocketPair()
      const [client, server] = Object.values(webSocketPair)
      server.accept()

      // Connect to the upstream WebSocket server
      const upstreamUrl = 'http://129.146.216.190:46232'
      const upstreamResponse = await fetch(upstreamUrl, {
        headers: {
          Upgrade: 'websocket',
        },
      })

      const upstreamWebSocket = upstreamResponse.webSocket
      if (!upstreamWebSocket) {
        const text = await upstreamResponse.text().catch(() => null)
        reject(
          `Expected WebSocket response from ${upstreamUrl}, got ${
            upstreamResponse.status
          }: ${text || upstreamResponse.statusText}`
        )
        return
      }

      upstreamWebSocket.accept()
      console.log('Connected to upstream')

      upstreamWebSocket.addEventListener('open', () => {
        console.log('Upstream open')
        // Proxy messages from client to upstream
        server.addEventListener('message', (event) => {
          upstreamWebSocket.send(event.data)
        })

        // Proxy messages from upstream to client
        upstreamWebSocket.addEventListener('message', (event) => {
          console.log('Got info from server', event.data)
          server.send(event.data)
        })

        // Handle close events
        server.addEventListener('close', () => {
          upstreamWebSocket.close()
        })

        upstreamWebSocket.addEventListener('close', () => {
          server.close()
        })

        resolve(client)
      })

      upstreamWebSocket.addEventListener('error', (event) => {
        console.log('Error', event)
        reject(event)
      })
    })

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  },
}
