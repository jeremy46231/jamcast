<script lang="ts">
  import { webRTCConnect } from '../../../webrtc'
  import { untrack } from 'svelte'
  import { browser } from '$app/environment'

  // Variables
  const isEmbedded = browser ? window.parent !== window : false

  let stream: MediaStream | null = $state(null)
  let connected = $derived(stream !== null)

  let currentAudioContext: AudioContext | null = $state(null)
  let currentGainNode: GainNode | null = $state(null)
  let currentAnalyzerNode: AnalyserNode | null = $state(null)

  let frequencyData: number[] | null = $state(null)

  let isMuted = $state(true)
  let autoplayAttempted = $state(false)
  let volume = $state(1)
  let actualVolume = $derived(isMuted ? 0 : volume)

  const svgBarWidth = 3
  const svgPadding = 1
  const svgBarCount = 128
  const svgBarHeight = 200

  // Media streaming
  // Get streams from WebRTC
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
  // Set up audio context
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

    audioContext.resume()
    if (!autoplayAttempted && audioContext.state === 'running') {
      isMuted = false
    }
    autoplayAttempted = true

    return () => {
      gainNode.disconnect()
      clearInterval(analyzerInterval)
    }
  })
  // Connect streams to audio context
  $effect(() => {
    if (
      !stream ||
      !currentAudioContext ||
      !currentGainNode ||
      !currentAnalyzerNode
    )
      return

    const source = currentAudioContext.createMediaStreamSource(stream)
    source.connect(currentGainNode)
    source.connect(currentAnalyzerNode)

    return () => {
      source.disconnect()
    }
  })

  // Attach volume control to audio context
  $effect(() => {
    if (currentGainNode) {
      currentGainNode.gain.value = actualVolume
    }
    if (currentAudioContext?.state === 'suspended') {
      currentAudioContext.resume()
    }
  })

  // Media metadata
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
  // Update media metadata playback state
  $effect(() => {
    navigator.mediaSession.playbackState = isMuted ? 'paused' : 'playing'
  })
</script>

<title>Jamcast</title>
<meta name="description" content="Listen to music streamed from the Jamcast Spotify Jam at a higher quality and lower latency than the Slack huddle." />
<meta property="og:title" content="Jamcast" />
<meta property="og:description" content="Listen to music streamed from the Jamcast Spotify Jam at a higher quality and lower latency than the Slack huddle." />
<meta property="og:url" content="https://jamcast.jer.app" />
<meta property="og:image" content="https://jamcast.jer.app/logo.png" />
<meta property="og:type" content="website" />
<meta name="twitter:title" content="Jamcast" />
<meta name="twitter:description" content="Listen to music streamed from the Jamcast Spotify Jam at a higher quality and lower latency than the Slack huddle." />
<meta name="twitter:image" content="https://jamcast.jer.app/logo.png" />

<!-- set up social data for embeds -->


<div class="controls">
  <div
    class="status-indicator"
    aria-label={connected ? 'Connected' : 'Disconnected'}
    title={connected ? 'Connected' : 'Disconnected'}
    role="status"
  >
    <div
      class={[
        'dot',
        { 'dot-connected': connected, 'dot-disconnected': !connected },
      ]}
    ></div>
    <div class={['pulse', { 'pulse-anim': connected }]}></div>
  </div>
  <button onclick={() => (isMuted = !isMuted)} disabled={!connected}>
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
  fill="#eee"
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
<div class="links">
  {#if isEmbedded}
    <a href={browser ? window.location.href : '#'} target="jamcast"
      >Open in Browser</a
    >
  {:else}
    <a href="https://app.slack.com/huddle/T0266FRGM/C07FFUNMXUG" target="slack"
      >Join Huddle</a
    >
  {/if}
  <a href="https://github.com/jeremy46231/jamcast#jamcast" target="jamcast-repo"
    >GitHub Repo</a
  >
</div>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: sans-serif;
    height: 100vh;
    overflow: hidden;
  }

  .controls {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    padding: 1rem;
    gap: 1rem;
    background-color: transparent;
    max-width: 45ch;
    flex-wrap: wrap;
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
    top: 0;
    left: 0;
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

  input[type='range'] {
    flex: 1;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .links {
    position: absolute;
    bottom: 0;
    left: 0;
    padding: 1rem;
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
  }
  .links a {
    color: blue;
    display: inline-block;
    max-width: 100%;
    white-space: normal;
  }
</style>
