export class MediaDevicesPolyfill extends EventTarget implements MediaDevices {
  private _stream: MediaStream | null = null
  private _pending: {
    resolve: (value: MediaStream) => void
    reject: (reason?: any) => void
  }[] = []
  _setStream(stream: MediaStream | null) {
    console.log('[jamcast] Setting stream:', stream)
    this._stream = stream
    if (this._stream) {
      Object.defineProperty(stream, 'id', {
        value: this._device.deviceId,
        writable: false,
        enumerable: false,
      })
      for (const { resolve, reject } of this._pending) {
        resolve(this._stream)
      }
    }
    this.dispatchEvent(new Event('devicechange'))
  }

  _device = {
    deviceId: 'jamcast-microphone',
    kind: 'audioinput' as const,
    label: 'Jamcast Microphone',
    groupId: 'jamcast-microphone-group',
    toJSON: () => this._device,
  }

  enumerateDevices() {
    console.log('[jamcast] Enumerating devices')
    return Promise.resolve([this._device])
  }

  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    console.log('[jamcast] getUserMedia called with:', constraints)
    return new Promise((resolve, reject) => {
      if (constraints && constraints.video) {
        return reject(
          new DOMException(
            'Video is not supported by this polyfill',
            'NotSupportedError'
          )
        )
      }

      if (!this._stream) {
        console.log('[jamcast] No stream available, waiting for one...')
        this._pending.push({ resolve, reject })
        return
      }

      resolve(this._stream)
    })
  }

  getSupportedConstraints() {
    console.log('[jamcast] getSupportedConstraints called')
    return {
      audio: true,
      deviceId: true,
      groupId: true,
    }
  }

  getDisplayMedia(options?: DisplayMediaStreamOptions): Promise<MediaStream> {
    console.log('[jamcast] getDisplayMedia called with options:', options)
    throw new Error('getDisplayMedia is not supported in this polyfill')
  }

  ondevicechange: ((this: MediaDevices, ev: Event) => any) | null = null
}
