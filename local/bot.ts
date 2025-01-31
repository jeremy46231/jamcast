import Slack from '@slack/bolt'

export const slack = new Slack.App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
})

export async function sendStreamMessage(channel: string) {
  const messages = await slack.client.conversations.history({
    channel,
    oldest: (new Date().getTime() / 1000 - 60 * 60).toFixed(4),
    limit: 999,
  })
  const huddleThread = messages.messages?.findLast(
    (m) => m.subtype === 'huddle_thread'
  )

  await slack.client.chat.postMessage({
    channel,
    thread_ts: huddleThread?.ts,
    text: 'Jamcast',
    blocks: [
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              {
                type: 'text',
                text: 'Stream the music in higher quality at ',
              },
              {
                type: 'link',
                url: 'https://jamcast.jer.app',
                text: 'jamcast.jer.app',
              },
              {
                type: 'text',
                text: ' or below:',
              },
            ],
          },
        ],
      },
      {
        type: 'video',
        title: {
          type: 'plain_text',
          text: 'Jamcast',
        },
        title_url: 'https://jamcast.jer.app',
        video_url: 'https://jamcast.jer.app',
        alt_text: 'Jamcast',
        thumbnail_url: 'https://placehold.co/360x283@2x.png?text=Jamcast',
      },
    ],
  })
}
