import { readFile, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { pathToFileURL } from 'url'
import matter from 'gray-matter'
import { projectRoot, getMarked } from './lib/content-utils.js'

const nowPath = join(projectRoot, 'now.md')
const distOutPath = join(projectRoot, 'dist', 'now.json')
const publicOutPath = join(projectRoot, 'public', 'now.json')

const marked = getMarked()

export async function buildNow() {
  try {
    await mkdir(join(projectRoot, 'dist'), { recursive: true })
    await mkdir(join(projectRoot, 'public'), { recursive: true })

    let raw
    try {
      raw = await readFile(nowPath, 'utf-8')
    } catch (err) {
      if (err.code === 'ENOENT') {
        const empty = JSON.stringify({ title: 'Now', updated: '', bodyHtml: '' }, null, 2)
        await writeFile(distOutPath, empty, 'utf-8')
        await writeFile(publicOutPath, empty, 'utf-8')
        console.log('No now.md found; wrote empty now.json')
        return
      }
      throw err
    }

    const { data, content } = matter(raw)
    const payload = {
      title: data.title ? String(data.title).trim() : 'Now',
      updated: data.updated ? String(data.updated).trim() : '',
      bodyHtml: content.trim() ? marked.parse(content.trim()) : ''
    }

    const json = JSON.stringify(payload, null, 2)
    await writeFile(distOutPath, json, 'utf-8')
    await writeFile(publicOutPath, json, 'utf-8')
    console.log('✓ Generated now.json')
  } catch (error) {
    console.error('Error building now.md:', error)
    process.exit(1)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildNow()
}
