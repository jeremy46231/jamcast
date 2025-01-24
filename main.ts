import puppeteer, { type Browser } from 'puppeteer'

// Launch the browser and open a new blank page
const browser = await puppeteer.launch({
  executablePath: '/snap/chromium/current/usr/lib/chromium-browser/chrome',
  args: ['--auto-accept-camera-and-microphone-capture'],
  ignoreDefaultArgs: ['--mute-audio'],
  defaultViewport: { width: 1920, height: 1080 },
})

const selectors = {
  email: '#email',
  password: '#password',
  signInButton: '#signin_btn',
  startHuddleButton: '[data-qa="huddle_channel_header_button__start_button"]',
  huddleSwitchDeviceButton:
    '[data-qa="huddle_multi_device_modal_switch_device"]',
  muteButton: '[data-qa="huddle_sidebar_footer_mute_button"]',
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function login(browser: Browser) {
  const email = process.env.SLACK_EMAIL
  const password = process.env.SLACK_PASSWORD
  if (!email || !password) {
    console.error('Please provide SLACK_EMAIL and SLACK_PASSWORD')
    process.exit(1)
  }

  console.log('Logging in...')
  const page = await browser.newPage()
  await page.goto(`https://hackclub.slack.com/sign_in_with_password`, {
    waitUntil: 'domcontentloaded',
  })
  await page.type(selectors.email, email)
  await page.type(selectors.password, password)
  console.log('Filled in email and password')

  await page.click(selectors.signInButton)
  console.log('Clicked sign in')

  await page.waitForNavigation()
  console.log('Logged in')

  await page.close()
}

await login(browser)

// const testPage = await browser.newPage()
// await testPage.screenshot({ path: 'temp.png' })
// await testPage.goto('https://mic-test.com/', {
//   waitUntil: 'domcontentloaded',
// })
// await testPage.screenshot({ path: 'temp.png' })
// await sleep(5000)
// await testPage.click('.css-6t4ruh')
// while (true) {
//   await sleep(1000)
//   await testPage.screenshot({ path: 'temp.png' })
// }

const channelID = 'C07FFUNMXUG'

console.log('Opening channel...')
const page = await browser.newPage()
const debugScreenshot = async () => {
  await page.screenshot({ path: 'temp.png' })
}

setInterval(() => {
  debugScreenshot()
}, 2000)

try {
  await page.goto(`https://app.slack.com/client/T0266FRGM/${channelID}`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForSelector(selectors.startHuddleButton, {
    visible: true,
    timeout: 15000,
  })

  page.on('console', (msg) => {
    if (!msg.text().includes('speciallogstring')) return
    console.log('Page log:', msg.text())
  })
  await page.evaluate(async () => {
    function allJSON(data: any) {
      function makeEnumerable(obj: any) {
        if (typeof obj !== 'object' || obj === null) return obj
        if (Array.isArray(obj)) return obj.map(makeEnumerable)
        return Object.fromEntries(
          Object.getOwnPropertyNames(obj).map((key) => [
            key,
            makeEnumerable(obj[key]),
          ])
        )
      }
      return JSON.stringify(makeEnumerable(data))
    }

    async function logAudio(stream: MediaStream) {
      const tracks = stream.getAudioTracks()
      for (const track of tracks) {
        console.log('speciallogstring   ', 'Track:', track.kind, track.label, allJSON(track))
        console.log('speciallogstring   ', JSON.stringify(Object.getOwnPropertyDescriptors(track)))
      }
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
      console.log(
        'speciallogstring   ',
        'Volume Array:',
        volumeArray.join(', ')
      )
      await audioContext.close()
    }

    console.log(
      '!!!!! speciallogstring',
      JSON.stringify(await navigator.mediaDevices.enumerateDevices())
    )

    function spyOnFunc<K extends string | number>(
      object: Record<K, (...args: any[]) => unknown>,
      name: K | K[]
    ) {
      if (Array.isArray(name)) {
        name.forEach((n) => spyOnFunc(object, n))
        return
      }
      const originalFunc = object[name]
      object[name] = function (...args) {
        console.log(
          'speciallogstring   ',
          `${name} called ${args.length}:`,
          ...args.map((a) => allJSON(a))
        )
        const result = originalFunc.apply(this, args)
        if (result instanceof Promise) {
          return result.then(async (res) => {
            if (res instanceof MediaStream) {
              console.log(
                'speciallogstring   ',
                `${name} returned a MediaStream\n  MediaStream info:`,
                res.active,
                allJSON(
                  res
                    .getTracks()
                    .map((t) => ({
                      kind: t.kind,
                      label: t.label,
                      deviceId: t.getSettings().deviceId,
                      muted: t.muted,
                      readyState: t.readyState,
                    }))
                )
              )
              await logAudio(res)
            }
            console.log(
              'speciallogstring   ',
              `${name} returned (promise):`,
              typeof res,
              res?.constructor?.name,
              allJSON(res)
            )
            return res
          })
        }
        console.log(
          'speciallogstring   ',
          `${name} returned:`,
          typeof result,
          result?.constructor?.name,
          allJSON(result)
        )
        return result
      }
    }
    spyOnFunc(navigator.mediaDevices, ['getUserMedia', 'enumerateDevices'])
    spyOnFunc(MediaStream.prototype, [
      'getTracks',
      'getAudioTracks',
      'getVideoTracks',
    ])
  })

  console.log('Joining huddle...')
  await page.click(selectors.startHuddleButton)
  await page.waitForSelector(
    `${selectors.muteButton}, ${selectors.huddleSwitchDeviceButton}`,
    { visible: true, timeout: 15000 }
  )

  if (await page.$(selectors.huddleSwitchDeviceButton)) {
    console.log('Switching device to this one...')
    await page.click(selectors.huddleSwitchDeviceButton)
    await page.waitForSelector(selectors.muteButton, {
      visible: true,
      timeout: 15000,
    })
  }

  const setMuted = async (muted: boolean) => {
    const mutedState = await page.$eval(
      selectors.muteButton,
      (el) => el.getAttribute('aria-pressed') === 'true'
    )
    if (mutedState === muted) return
    await page.click(selectors.muteButton)
  }

  await setMuted(false)

  console.log('Connected to huddle')
  await debugScreenshot()

  // await sleep(5000)
  // await page.click('[data-qa="more_actions_menu"]')
  // await sleep(3000)
  // await page.keyboard.press('ArrowUp')
  // await page.keyboard.press('ArrowUp')
  // // await page.keyboard.press('ArrowUp')
  // // await page.keyboard.press('ArrowUp')
  // // await page.keyboard.press('ArrowUp')
  // await sleep(3000)
  // await page.keyboard.press('ArrowRight')
  // await sleep(3000)
  // await page.keyboard.press('ArrowUp')
  // await page.keyboard.press('Enter')
  // // await page.mouse.move(/* middle of screen */ 960, 540)
  // // await page.mouse.wheel({ deltaY: -1000 })
  // await debugScreenshot()
} catch (err) {
  console.error(err)
  await debugScreenshot()
  await page.close()
  await browser.close()
  process.exit(1)
}
