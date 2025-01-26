<script lang="ts">
  import { webRTCConnect } from '../../../../webrtc'

  let stream: MediaStream | null = $state(null)

  $effect(() => {
    const callback = (newStream: MediaStream | null) => {
      console.log('Stream updated', newStream)
      stream = newStream
    }
    const streamCallbacks = webRTCConnect()
    streamCallbacks.add(callback)
    return () => {
      streamCallbacks.delete(callback)
    }
  })
</script>