const pulseaudioSource = 'SpotifySink.monitor'
const combined = Bun.spawn({
  cmd: [
    'sh',
    '-c',
    `parec -d ${pulseaudioSource} | ffmpeg -f s16le -ar 44100 -ac 2 -i pipe:0 -f mp3 -flush_packets 1 -max_delay 0 -v 0 -`,
  ],
  stdout: 'pipe',
  stderr: 'inherit',
})
const audioOutput: ReadableStream<Uint8Array> = combined.stdout

class MultiPassThrough<T extends unknown> {
  private controllers = new Map<Symbol, ReadableStreamDefaultController<T>>()

  writable = new WritableStream<T>({
    write: (chunk) => {
      // console.log('writing', chunk.byteLength, 'bytes to', this.controllers.size, 'controllers')
      for (const c of this.controllers.values()) c.enqueue(chunk)
    },
    close: () => {
      for (const c of this.controllers.values()) c.close()
      this.controllers = new Map()
    },
    abort: (reason) => {
      for (const c of this.controllers.values()) c.error(reason)
      this.controllers = new Map()
    },
  })

  createReadable() {
    const key = Symbol()
    const controllers = this.controllers
    const readable = new ReadableStream<T>({
      start(controller) {
        controllers.set(key, controller)
      },
      cancel() {
        controllers.delete(key)
      },
    })
    return readable
  }
}

const multiplexer = new MultiPassThrough<Uint8Array>()
audioOutput.pipeTo(multiplexer.writable)

export function createAudioResponse() {
  const stream = multiplexer.createReadable()

  return new Response(stream, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
