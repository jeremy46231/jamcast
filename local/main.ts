import { sendStreamMessage } from './bot'
import { connectToHuddle, startBrowser } from './browser'
import { sleep } from './helpers'

const channelID = 'C07FFUNMXUG'

const browser = await startBrowser()

// await connectToHuddle(browser, channelID)
await sleep(1000)
await sendStreamMessage(channelID)
