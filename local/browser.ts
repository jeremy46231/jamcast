import puppeteer, { type Browser } from 'puppeteer'
import { getRTCBundle, sleep } from './helpers'

const debug = false

const selectors = {
  email: '#email',
  password: '#password',
  signInButton: '#signin_btn',
  startHuddleButton: '[data-qa="huddle_channel_header_button__start_button"]',
  huddleSwitchDeviceButton:
    '[data-qa="huddle_multi_device_modal_switch_device"]',
  muteButton: '[data-qa="huddle_sidebar_footer_mute_button"]',
}

async function login(browser: Browser) {
  const email = process.env.SLACK_EMAIL
  const password = process.env.SLACK_PASSWORD
  if (!email || !password) {
    console.error('Please provide SLACK_EMAIL and SLACK_PASSWORD')
    process.exit(1)
  }

  console.log('Logging in...')

  const cookies = await browser.cookies()
  await browser.deleteCookie(
    ...cookies.filter((c) => c.domain.endsWith('.slack.com'))
  )

  const page = await browser.newPage()

  await page.goto(`https://hackclub.slack.com/sign_in_with_password`, {
    waitUntil: 'domcontentloaded',
  })

  await page.type(selectors.email, email)
  await page.type(selectors.password, password)
  console.log('Filled in email and password')

  await page.click(selectors.signInButton)
  console.log('Clicked sign in')

  await sleep(5000)
  console.log('Logged in')

  await page.close()
}

export async function startBrowser() {
  const browser = await puppeteer.launch({
    browser: 'chrome',
    userDataDir: 'chrome-profile',
    args: [
      // '--unsafely-treat-insecure-origin-as-secure=ws://129.146.216.190:46232,ws://localhost:46232',
      '--autoplay-policy=no-user-gesture-required',
      '--window-size=1920,1080',
    ],
    ignoreDefaultArgs: ['--mute-audio'],

    defaultViewport: null, // { width: 1000, height: 600 },

    headless: false,
    debuggingPort: debug ? 9222 : undefined,
    devtools: debug,
  })

  await login(browser)

  return browser
}

export async function connectToHuddle(browser: Browser, channelID: string) {
  console.log('Opening channel...')
  const page = await browser.newPage()

  await page.goto(`https://app.slack.com/client/T0266FRGM/${channelID}`, {
    waitUntil: 'domcontentloaded',
  })
  await page.evaluate(await getRTCBundle())
  await page.waitForSelector(selectors.startHuddleButton, {
    visible: true,
  })

  console.log('Joining huddle...')
  await page.click(selectors.startHuddleButton)
  await page.waitForSelector(
    `${selectors.muteButton}, ${selectors.huddleSwitchDeviceButton}`,
    { visible: true }
  )

  if (await page.$(selectors.huddleSwitchDeviceButton)) {
    console.log('Switching device to this one...')
    await page.click(selectors.huddleSwitchDeviceButton)
    await page.waitForSelector(selectors.muteButton, {
      visible: true,
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

  return [browser, page]
}
