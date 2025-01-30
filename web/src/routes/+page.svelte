<script lang="ts">
  import { webRTCConnect } from '../../../webrtc'
  import { untrack } from 'svelte'

  let stream: MediaStream | null = $state(null)
  let connected = $derived(stream !== null)
  let currentAudioContext: AudioContext | null = $state(null)
  let currentGainNode: GainNode | null = $state(null)
  let currentAnalyzerNode: AnalyserNode | null = $state(null)

  let frequencyData: number[] | null = $state(null)

  let isMuted = $state(true)
  let volume = $state(1)
  let actualVolume = $derived(isMuted ? 0 : volume)

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

  $effect(() => {
    if (!stream) return

    const audioContext = new AudioContext()
    currentAudioContext = audioContext

    const gainNode = audioContext.createGain()
    gainNode.gain.value = untrack(() => actualVolume)
    gainNode.connect(audioContext.destination)
    currentGainNode = gainNode

    const analyzerNode = audioContext.createAnalyser()
    analyzerNode.fftSize = svgBarCount * 2
    const bufferLength = analyzerNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const analyzerInterval = setInterval(() => {
      analyzerNode.getByteFrequencyData(dataArray)
      frequencyData = Array.from(dataArray)
    }, 10)
    currentAnalyzerNode = analyzerNode

    return () => {
      gainNode.disconnect()
      clearInterval(analyzerInterval)
    }
  })

  $effect(() => {
    if (!stream || !currentAudioContext || !currentGainNode || !currentAnalyzerNode) return

    const source = currentAudioContext.createMediaStreamSource(stream)
    source.connect(currentGainNode)
    source.connect(currentAnalyzerNode)

    return () => {
      source.disconnect()
    }
  })

  $effect(() => {
    if (currentGainNode) {
      currentGainNode.gain.value = actualVolume
    }
    if (currentAudioContext?.state === 'suspended') {
      currentAudioContext.resume()
    }
  })

  $effect(() => {
    stream
    isMuted
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Jamcast',
      artist: 'Spotify',
      album: 'Piracy hehheh',
    })

    navigator.mediaSession.setActionHandler('play', () => {
      isMuted = false
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      isMuted = true
    })

    try {
      navigator.mediaSession.setPositionState({
        duration: Infinity,
      })
    } catch {}

    return () => {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setPositionState(undefined)
    }
  })
  $effect(() => {
    navigator.mediaSession.playbackState = isMuted ? 'paused' : 'playing'
  })

  function logMap(x: number, k = 1) {
    if (x < 0 || x > 1) throw new RangeError('Input x must be in [0,1]')
    return Math.log(1 + k * x) / Math.log(1 + k)
  }

  const svgBarWidth = 3
  const svgPadding = 1
  const svgBarCount = 128
  const svgBarHeight = 200
</script>

<div class="controls">
  <div class="status-indicator">
    <div class={['dot', { 'dot-connected': connected, 'dot-disconnected': !connected }]}></div>
    <div class={['pulse', { 'pulse-anim': connected }]}></div>
  </div>
  <button
    onclick={() => (isMuted = !isMuted)}
    disabled={!connected}
  >
    {!connected ? 'Disconnected' : isMuted ? 'Play' : 'Pause'}
  </button>
  <input
    type="range"
    min="0"
    max="1"
    step="0.01"
    bind:value={volume}
    disabled={!connected}
  />
</div>
<svg
  viewBox={`0 0 ${(svgBarWidth + svgPadding) * svgBarCount - svgPadding} ${svgBarHeight}`}
  preserveAspectRatio="none"
  fill={isMuted ? '#eee': '#00cc44'}
>
  {#if frequencyData}
    {#each frequencyData as raw, index}
      {@const value = (raw / 255) * svgBarHeight}
      <rect
        x={index * (svgBarWidth + svgPadding)}
        y={svgBarHeight - value}
        width={svgBarWidth}
        height={value}
      />
    {/each}
  {/if}
</svg>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: sans-serif;
    background-color: #fafafa;
    height: 100vh;
    overflow: hidden;
  }

  .controls {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    padding: 1rem;
    gap: 1rem;
    background-color: rgba(250, 250, 250, 0.5);
  }

  .status-indicator {
    position: relative;
    width: 0.7rem;
    height: 0.7rem;
  }

  .dot {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }

  .dot-connected {
    background-color: #00cc44;
  }

  .dot-disconnected {
    background-color: #aaa;
  }

  .pulse {
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    pointer-events: none;
    transform: scale(1);
    opacity: 0;
    background-color: #00cc44;
  }

  .pulse-anim {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 0.3;
    }
    75% {
      transform: scale(2.5);
      opacity: 0;
    }
  }

  button {
    min-width: 14ch;
    text-align: center;
    padding: 0.5rem;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
