// Runs on Cloudflare Workers to proxy WebSocket connections because we need HTTPS (wss://) on secure origins

export default {
  async fetch(request, env, ctx) {
    const upgradeHeader = request.headers.get('Upgrade')
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 })
    }

    // Create a WebSocketPair
    const webSocketPair = new WebSocketPair()
    const [client, server] = Object.values(webSocketPair)

    // Accept the server WebSocket
    server.accept()

    // Connect to the upstream WebSocket server
    const upstreamUrl = 'ws://129.146.216.190:46232'
    const upstreamWebSocket = new WebSocket(upstreamUrl)

    upstreamWebSocket.addEventListener('open', () => {
      // Proxy messages from client to upstream
      server.addEventListener('message', (event) => {
        upstreamWebSocket.send(event.data)
      })

      // Proxy messages from upstream to client
      upstreamWebSocket.addEventListener('message', (event) => {
        server.send(event.data)
      })

      // Handle close events
      server.addEventListener('close', () => {
        upstreamWebSocket.close()
      })

      upstreamWebSocket.addEventListener('close', () => {
        server.close()
      })
    })

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  },
}
