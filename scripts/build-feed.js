import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { pathToFileURL } from 'url'
import {
  projectRoot,
  SITE_BASE,
  escapeHtml,
  escapeXml,
  escapeCdata,
  toRssPubDate
} from './lib/content-utils.js'
import { parseThoughts } from './build-thoughts.js'
import { parseRadar } from './build-radar.js'

function generateRss(items) {
  const channelTitle = 'Reuben Peter-Paul'
  const channelLink = `${SITE_BASE}/`
  const channelDescription = 'Working radar and field notes from Reuben Peter-Paul.'
  const lastBuildDate = new Date().toUTCString()

  const itemsXml = items.map(entry => {
    const pubDate = toRssPubDate(entry.date)
    const contentEncoded = entry.contentHtml
      ? `    <content:encoded><![CDATA[\n${escapeCdata(entry.contentHtml)}\n]]></content:encoded>\n`
      : ''
    const categoriesXml = (entry.categories || [])
      .map(cat => `    <category>${escapeXml(cat)}</category>\n`)
      .join('')

    return `  <item>
    <title>${escapeXml(entry.title)}</title>
    <link>${escapeXml(entry.link)}</link>
${categoriesXml}${contentEncoded}    <description>${escapeXml(entry.description)}</description>
    <pubDate>${pubDate}</pubDate>
    <guid isPermaLink="true">${escapeXml(entry.guid)}</guid>
  </item>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelLink)}</link>
    <atom:link href="${escapeXml(SITE_BASE + '/feed.xml')}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(channelDescription)}</description>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${itemsXml}
  </channel>
</rss>
`
}

export async function buildFeed() {
  try {
    const [thoughts, radarItems] = await Promise.all([
      parseThoughts(),
      parseRadar()
    ])

    const feedItems = []

    for (const entry of thoughts) {
      if (entry.draft || entry.archived || entry.unlisted) continue
      const link = entry.external_url || `${SITE_BASE}/blog/${entry.filename}`
      feedItems.push({
        type: 'field-note',
        sortKey: entry.file,
        title: entry.title,
        link,
        guid: link,
        date: entry.date,
        description: entry.excerpt || entry.title,
        contentHtml: entry.rssContentHtml || null,
        categories: ['Field Notes']
      })
    }

    for (const item of radarItems) {
      if (item.draft) continue
      const permalink = `${SITE_BASE}${item.permalink}`
      const sourceLinkHtml = item.url
        ? `\n<p><a href="${escapeHtml(item.url)}">Link: ${escapeHtml(item.source || item.url)}</a></p>`
        : ''
      const contentHtml = `${item.bodyHtml}${sourceLinkHtml}`.trim()
      const description = item.url
        ? `${item.excerpt}${item.excerpt ? ' — ' : ''}${item.url}`
        : (item.excerpt || item.title)

      feedItems.push({
        type: 'radar',
        sortKey: item.file,
        title: item.title,
        link: permalink,
        guid: permalink,
        date: item.date,
        description,
        contentHtml: contentHtml || null,
        categories: ['Worth Looking At', ...item.tags]
      })
    }

    feedItems.sort((a, b) => b.date.localeCompare(a.date) || b.sortKey.localeCompare(a.sortKey))

    const rssXml = generateRss(feedItems)
    const distFeedPath = join(projectRoot, 'dist', 'feed.xml')
    const publicFeedPath = join(projectRoot, 'public', 'feed.xml')

    await mkdir(join(projectRoot, 'dist'), { recursive: true })
    await mkdir(join(projectRoot, 'public'), { recursive: true })
    await writeFile(distFeedPath, rssXml, 'utf-8')
    await writeFile(publicFeedPath, rssXml, 'utf-8')

    console.log(`✓ Generated feed.xml (${feedItems.length} item(s): ${feedItems.filter(i => i.type === 'radar').length} radar, ${feedItems.filter(i => i.type === 'field-note').length} field notes)`)
  } catch (error) {
    console.error('Error building RSS feed:', error)
    process.exit(1)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildFeed()
}
