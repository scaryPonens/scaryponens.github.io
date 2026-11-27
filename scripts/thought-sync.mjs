#!/usr/bin/env node
import { readFile, writeFile, mkdir, access } from 'fs/promises'
import { watch as watchFs } from 'fs'
import { join, resolve, dirname, basename } from 'path'
import { pathToFileURL } from 'url'
import * as cheerio from 'cheerio'
import matter from 'gray-matter'
import { Marked } from 'marked'
import { parseAst } from 'rollup/parseAst'
import { projectRoot } from './lib/content-utils.js'

const DEFAULT_THOUGHTS_DIR = join(projectRoot, 'thoughts')

function createInlineMarked() {
  return new Marked({
    gfm: true,
    breaks: false,
    renderer: {
      link(arg0, arg1, arg2) {
        let href, title, text
        if (arg0 && typeof arg0 === 'object') {
          href = arg0.href || ''
          title = arg0.title || null
          text = this.parser.parseInline(arg0.tokens)
        } else {
          href = arg0 || ''
          title = arg1 || null
          text = arg2 || ''
        }
        const safeHref = escapeAttr(decodeBasicEntities(href))
        const isExternal = /^https?:\/\//i.test(href)
        const extAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''
        const titleAttr = title ? ` title="${escapeAttr(decodeBasicEntities(title))}"` : ''
        return `<a href="${safeHref}"${extAttrs}${titleAttr}>${text}</a>`
      }
    }
  })
}

const inlineMarked = createInlineMarked()

function decodeBasicEntities(str) {
  return String(str)
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function unescapeInlineQuotes(html) {
  // Inside element bodies (not attributes), keep straight quotes readable as authored.
  return html.replace(/(<[^>]+>)|(&quot;|&#39;|&#039;)/g, (match, tag, entity) => {
    if (tag) return tag
    if (entity === '&quot;') return '"'
    return "'"
  })
}

export function renderInlineMarkdown(md) {
  const normalized = String(md).trim().replace(/\s*\n\s*/g, ' ')
  const rendered = inlineMarked.parseInline(normalized)
  return unescapeInlineQuotes(rendered)
}

export function htmlToPlainText(htmlFragment) {
  const $frag = cheerio.load(htmlFragment, null, false)
  return $frag.text().replace(/\s+/g, ' ').trim()
}

function serializeAttrs(attribs = {}) {
  const parts = []
  for (const [k, v] of Object.entries(attribs)) {
    if (v === '') {
      parts.push(k)
    } else {
      parts.push(`${k}="${escapeAttr(v)}"`)
    }
  }
  return parts.length ? ' ' + parts.join(' ') : ''
}

function wrapDelimiter(inner, marker) {
  if (!inner) return ''
  const leadMatch = inner.match(/^\s+/)
  const trailMatch = inner.match(/\s+$/)
  const lead = leadMatch ? leadMatch[0] : ''
  const trail = trailMatch ? trailMatch[0] : ''
  const core = inner.slice(lead.length, inner.length - trail.length)
  if (!core) return inner
  return `${lead}${marker}${core}${marker}${trail}`
}

function formatCodeSpan(codeText) {
  if (!codeText.includes('`')) {
    return `\`${codeText}\``
  }
  const pad = codeText.startsWith('`') || codeText.endsWith('`') ? ' ' : ''
  return `\`\`${pad}${codeText}${pad}\`\``
}

export function inlineNodesToMarkdown($, nodes, { preserveLineBreaks = false } = {}) {
  let out = ''
  for (const node of nodes || []) {
    if (node.type === 'text') {
      const escaped = node.data
        .replace(/</g, '\\<')
        .replace(/>/g, '\\>')
      out += escaped
      continue
    }
    if (node.type !== 'tag') continue

    const tag = node.tagName.toLowerCase()
    if (tag === 'strong' || tag === 'b') {
      out += wrapDelimiter(inlineNodesToMarkdown($, node.children, { preserveLineBreaks }), '**')
    } else if (tag === 'em' || tag === 'i') {
      out += wrapDelimiter(inlineNodesToMarkdown($, node.children, { preserveLineBreaks }), '*')
    } else if (tag === 'code') {
      out += formatCodeSpan($(node).text())
    } else if (tag === 'br') {
      out += preserveLineBreaks ? '\n' : '<br>'
    } else if (tag === 'a') {
      const attribs = node.attribs || {}
      const href = attribs.href || ''
      const title = attribs.title || ''
      const allowedKeys = new Set(['href', 'title', 'target', 'rel'])
      const hasCustomAttrs = Object.keys(attribs).some(k => !allowedKeys.has(k))
      const inner = inlineNodesToMarkdown($, node.children, { preserveLineBreaks })
      if (!hasCustomAttrs && href) {
        const titlePart = title ? ` "${title.replace(/"/g, '\\"')}"` : ''
        out += `[${inner}](${href}${titlePart})`
      } else {
        out += `<a${serializeAttrs(attribs)}>${inner}</a>`
      }
    } else {
      const inner = inlineNodesToMarkdown($, node.children, { preserveLineBreaks })
      out += `<${tag}${serializeAttrs(node.attribs)}>${inner}</${tag}>`
    }
  }
  return out
}

function normalizeInlineMarkdownWhitespace(md, { preserveNewlinesBeforeTags = false } = {}) {
  if (preserveNewlinesBeforeTags) {
    return md
      .trim()
      .split('\n')
      .map(line => line.replace(/[ \t]+/g, ' ').trim())
      .filter(Boolean)
      .join('\n')
  }
  return md.replace(/\s+/g, ' ').trim()
}

function detectInnerWrap(rawHtml, el) {
  const loc = el.sourceCodeLocation
  if (!loc || !loc.startTag || !loc.endTag) {
    return { prefix: '', suffix: '', lineIndent: '' }
  }
  const rawInner = rawHtml.slice(loc.startTag.endOffset, loc.endTag.startOffset)
  const leadMatch = rawInner.match(/^(\r?\n[ \t]*)/)
  const trailMatch = rawInner.match(/(\r?\n[ \t]*)$/)
  const prefix = leadMatch ? leadMatch[1] : ''
  const suffix = trailMatch ? trailMatch[1] : ''
  const indentMatch = prefix.match(/([ \t]*)$/)
  const lineIndent = indentMatch ? indentMatch[1] : ''
  return { prefix, suffix, lineIndent }
}

/**
 * Discover all editable DOM slots + optional JSON widget slots in a Field Note HTML document.
 */
export function discoverSlots(rawHtml) {
  const $ = cheerio.load(rawHtml, { sourceCodeLocationInfo: true })
  const slots = []

  const h1 = $('h1.hero-title').first()
  if (h1.length) {
    const heroKicker = h1.prevAll('.kicker').first()
    if (heroKicker.length) {
      slots.push(makeInlineElementSlot($, rawHtml, 'hero.kicker', heroKicker[0], { section: 'Hero' }))
    }
    slots.push(makeHeroTitleSlot($, rawHtml, 'hero.title', h1[0]))
  }

  const heroLead = $('p.lead').first()
  if (heroLead.length) {
    slots.push(makeInlineElementSlot($, rawHtml, 'hero.lead', heroLead[0]))
  }

  const heroCompanion = $('p.companion-note').first()
  if (heroCompanion.length) {
    slots.push(makeInlineElementSlot($, rawHtml, 'hero.companion', heroCompanion[0]))
  }

  const preambleEl = $('.preamble').not('section .preamble').first()
  if (preambleEl.length) {
    const labelEl = preambleEl.find('.preamble-label').first()
    if (labelEl.length) {
      slots.push(makeInlineElementSlot($, rawHtml, 'preamble.label', labelEl[0], { section: 'Preamble' }))
    }
    const bodyContainer = preambleEl.find('.preamble-body').first()
    const container = bodyContainer.length ? bodyContainer : preambleEl
    const bodyParas = container.children('p').toArray()
    if (bodyParas.length > 0) {
      slots.push(
        makeParagraphGroupSlot($, rawHtml, 'preamble.body', container[0], bodyParas, {
          section: labelEl.length ? null : 'Preamble'
        })
      )
    } else if (bodyContainer.length) {
      slots.push(
        makeInlineElementSlot($, rawHtml, 'preamble.body', bodyContainer[0], {
          section: labelEl.length ? null : 'Preamble'
        })
      )
    }
  }

  $('section').each((secIdx, secEl) => {
    const secNum = secIdx + 1
    const secPrefix = `sec${secNum}`
    const dividerLabel = `Section ${String(secNum).padStart(2, '0')}`

    const secKicker = $(secEl).children('.kicker').first()
    if (secKicker.length) {
      slots.push(makeInlineElementSlot($, rawHtml, `${secPrefix}.kicker`, secKicker[0], { section: dividerLabel }))
    }

    const secTitle = $(secEl).find('h2.sec-title').first()
    if (secTitle.length) {
      slots.push(
        makeInlineElementSlot($, rawHtml, `${secPrefix}.title`, secTitle[0], {
          section: secKicker.length ? null : dividerLabel
        })
      )
    }

    // Prose blocks (only direct <p> children so floating <figure> and <aside class="side-note"> stay untouched)
    $(secEl)
      .find('.prose')
      .each((proseIdx, proseEl) => {
        const paragraphs = $(proseEl).children('p').toArray()
        if (paragraphs.length > 0) {
          slots.push(makeParagraphGroupSlot($, rawHtml, `${secPrefix}.prose.${proseIdx + 1}`, proseEl, paragraphs))
        }
      })

    // Side-note callouts
    $(secEl)
      .find('.side-note')
      .each((snIdx, snEl) => {
        const labelEl = $(snEl).find('.side-note-label').first()
        if (labelEl.length) {
          slots.push(makeInlineElementSlot($, rawHtml, `${secPrefix}.sidenote.${snIdx + 1}.label`, labelEl[0]))
        }
        const bodyParas = $(snEl).children('p').toArray()
        if (bodyParas.length > 0) {
          slots.push(makeParagraphGroupSlot($, rawHtml, `${secPrefix}.sidenote.${snIdx + 1}.body`, snEl, bodyParas))
        }
      })

    // Figcaptions (e.g., Breeze floating portrait quote)
    $(secEl)
      .find('figcaption')
      .each((fcIdx, fcEl) => {
        const hasMultilineChild = rawHtml
          .slice(fcEl.sourceCodeLocation.startTag.endOffset, fcEl.sourceCodeLocation.endTag.startOffset)
          .trim()
          .includes('\n')
        slots.push(
          makeInlineElementSlot($, rawHtml, `${secPrefix}.figcaption.${fcIdx + 1}`, fcEl, {
            preserveNewlines: hasMultilineChild
          })
        )
      })

    // Quiz cards
    $(secEl)
      .find('.quiz-card')
      .each((qIdx, cardEl) => {
        const qEl = $(cardEl).find('.quiz-q').first()
        if (qEl.length) {
          slots.push(makeInlineElementSlot($, rawHtml, `${secPrefix}.quiz.${qIdx + 1}.q`, qEl[0]))
        }
        const expEl = $(cardEl).find('.quiz-explain[data-right]').first()
        if (expEl.length) {
          slots.push(makeAttrInlineSlot($, rawHtml, `${secPrefix}.quiz.${qIdx + 1}.explain`, expEl[0], 'data-right'))
        }
      })
  })

  // Optional JSON copy block: <script id="field-note-copy" type="application/json">
  const copyScriptEl = $('script#field-note-copy[type="application/json"]').first()
  let widgetJsonMeta = null
  if (copyScriptEl.length) {
    const el = copyScriptEl[0]
    const rawJsonText = $(el).html() || '{}'
    let parsedJson
    try {
      parsedJson = JSON.parse(rawJsonText)
    } catch (err) {
      throw new Error(`Invalid JSON inside <script id="field-note-copy">: ${err.message}`)
    }
    const htmlPatterns = Array.isArray(parsedJson._htmlFields) ? parsedJson._htmlFields : []
    const widgetSlots = collectWidgetJsonSlots(parsedJson, htmlPatterns)
    if (widgetSlots.length > 0) {
      widgetSlots[0].section = 'Interactive Widgets (JSON Copy)'
    }
    slots.push(...widgetSlots)
    widgetJsonMeta = {
      startOffset: el.sourceCodeLocation.startTag.endOffset,
      endOffset: el.sourceCodeLocation.endTag.startOffset,
      rawInner: rawJsonText,
      parsedJson,
      htmlPatterns
    }
  }

  return { $, slots, widgetJsonMeta }
}

function makeInlineElementSlot($, rawHtml, id, el, { section = null, preserveNewlines = false } = {}) {
  const loc = el.sourceCodeLocation
  const wrap = detectInnerWrap(rawHtml, el)
  const rawMd = inlineNodesToMarkdown($, el.children, { preserveLineBreaks: preserveNewlines })
  const markdown = normalizeInlineMarkdownWhitespace(rawMd, { preserveNewlinesBeforeTags: preserveNewlines })

  return {
    id,
    kind: 'inline-element',
    section,
    markdown,
    startOffset: loc.startTag.endOffset,
    endOffset: loc.endTag.startOffset,
    originalRaw: rawHtml.slice(loc.startTag.endOffset, loc.endTag.startOffset),
    render(newMd) {
      if (preserveNewlines && newMd.includes('\n')) {
        const lines = newMd
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean)
          .map(l => renderInlineMarkdown(l))
        const joiner = `\n${wrap.lineIndent || '            '}`
        return `${wrap.prefix}${lines.join(joiner)}${wrap.suffix}`
      }
      return `${wrap.prefix}${renderInlineMarkdown(newMd)}${wrap.suffix}`
    }
  }
}

function makeHeroTitleSlot($, rawHtml, id, el) {
  const loc = el.sourceCodeLocation
  const wrap = detectInnerWrap(rawHtml, el)
  const rawMd = inlineNodesToMarkdown($, el.children, { preserveLineBreaks: true })
  const markdown = rawMd
    .split('\n')
    .map(l => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')

  return {
    id,
    kind: 'hero-title',
    section: null,
    markdown,
    startOffset: loc.startTag.endOffset,
    endOffset: loc.endTag.startOffset,
    originalRaw: rawHtml.slice(loc.startTag.endOffset, loc.endTag.startOffset),
    render(newMd) {
      const lines = String(newMd)
        .trim()
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
      const renderedLines = lines.map(l => renderInlineMarkdown(l))
      if (renderedLines.length <= 1) {
        return `${wrap.prefix}${renderedLines[0] || ''}${wrap.suffix}`
      }
      const indent = wrap.lineIndent || '      '
      let combined = renderedLines[0]
      for (let i = 1; i < renderedLines.length; i++) {
        const nextLine = renderedLines[i]
        // .hero-title em already has `display: block` in Field Note CSS
        const br = /^<em>[\s\S]*<\/em>$/.test(nextLine) ? '' : '<br>'
        combined += `${br}\n${indent}${nextLine}`
      }
      return `${wrap.prefix}${combined}${wrap.suffix}`
    },
    toPlainText(newMd) {
      const lines = String(newMd)
        .trim()
        .split('\n')
        .map(l => htmlToPlainText(renderInlineMarkdown(l)))
        .filter(Boolean)
      return lines.join(' ')
    }
  }
}

function makeParagraphGroupSlot($, rawHtml, id, containerEl, paragraphs, { section = null } = {}) {
  const firstLoc = paragraphs[0].sourceCodeLocation
  const lastLoc = paragraphs[paragraphs.length - 1].sourceCodeLocation

  // Verify no non-<p> element sits in between paragraphs[0] and paragraphs[last]
  const allElementChildren = $(containerEl).children().toArray()
  const firstIdx = allElementChildren.indexOf(paragraphs[0])
  const lastIdx = allElementChildren.indexOf(paragraphs[paragraphs.length - 1])
  for (let i = firstIdx; i <= lastIdx; i++) {
    if (allElementChildren[i].tagName.toLowerCase() !== 'p') {
      throw new Error(`Non-paragraph element <${allElementChildren[i].tagName}> interleaved inside ${id}`)
    }
  }

  const pIndent = ' '.repeat(Math.max(0, (firstLoc.startCol || 9) - 1))
  const firstWrap = detectInnerWrap(rawHtml, paragraphs[0])
  const innerIndent = firstWrap.lineIndent || pIndent + '  '
  const isMultilineP = firstWrap.prefix.includes('\n')

  const mdParas = paragraphs.map(pEl => {
    const rawMd = inlineNodesToMarkdown($, pEl.children)
    return normalizeInlineMarkdownWhitespace(rawMd)
  })

  return {
    id,
    kind: 'paragraph-group',
    section,
    markdown: mdParas.join('\n\n'),
    startOffset: firstLoc.startOffset,
    endOffset: lastLoc.endOffset,
    originalRaw: rawHtml.slice(firstLoc.startOffset, lastLoc.endOffset),
    render(newMd) {
      const blocks = String(newMd)
        .trim()
        .split(/\n\s*\n+/)
        .map(b => b.trim())
        .filter(Boolean)
      return blocks
        .map((block, idx) => {
          const prefix = idx === 0 ? '' : pIndent
          const html = renderInlineMarkdown(block)
          if (isMultilineP) {
            return `${prefix}<p>\n${innerIndent}${html}\n${pIndent}</p>`
          }
          return `${prefix}<p>${html}</p>`
        })
        .join('\n')
    }
  }
}

function makeAttrInlineSlot($, rawHtml, id, el, attrName, { section = null } = {}) {
  const attrLoc = el.sourceCodeLocation?.attrs?.[attrName]
  if (!attrLoc) {
    throw new Error(`Missing sourceCodeLocation for attribute ${attrName} on slot ${id}`)
  }
  const attrVal = $(el).attr(attrName) || ''
  const $frag = cheerio.load(attrVal, null, false)
  const rawMd = inlineNodesToMarkdown($frag, $frag.root()[0].children)
  const markdown = normalizeInlineMarkdownWhitespace(rawMd)

  return {
    id,
    kind: 'attr-inline',
    section,
    markdown,
    startOffset: attrLoc.startOffset,
    endOffset: attrLoc.endOffset,
    originalRaw: rawHtml.slice(attrLoc.startOffset, attrLoc.endOffset),
    render(newMd) {
      const renderedHtml = renderInlineMarkdown(newMd)
      // Preserve inline HTML tags inside data-right="..." while escaping straight double quotes
      const safeAttrVal = renderedHtml.replace(/"/g, '&quot;')
      return `${attrName}="${safeAttrVal}"`
    }
  }
}

function matchesHtmlPattern(pathArr, htmlPatterns) {
  const dotPath = pathArr.join('.')
  for (const pat of htmlPatterns) {
    const regexStr =
      '^' +
      pat
        .split('.')
        .map(seg => (seg === '*' ? '[^.]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
        .join('\\.') +
      '$'
    if (new RegExp(regexStr).test(dotPath)) return true
  }
  return false
}

function isLikelyHtmlWidgetValue(val) {
  return /<(strong|em|code|a|br|span|u)\b|&(amp|lt|gt|quot|#39|#039);/i.test(val)
}

function collectWidgetJsonSlots(rootObj, htmlPatterns = []) {
  const widgetSlots = []

  function walk(node, pathArr) {
    if (node === null || node === undefined) return
    if (typeof node === 'string') {
      const isHtml =
        matchesHtmlPattern(pathArr, htmlPatterns) ||
        (htmlPatterns.length === 0 && isLikelyHtmlWidgetValue(node))
      let markdown
      if (isHtml) {
        const $frag = cheerio.load(node, null, false)
        const rawMd = inlineNodesToMarkdown($frag, $frag.root()[0].children, { preserveLineBreaks: true })
        markdown = rawMd
          .split('\n')
          .map(l => l.replace(/[ \t]+/g, ' ').trim())
          .filter(Boolean)
          .join('\n')
      } else {
        markdown = node
      }
      widgetSlots.push({
        id: `widget.${pathArr.join('.')}`,
        kind: 'widget-json',
        section: null,
        pathArr,
        isHtml,
        originalValue: node,
        markdown,
        renderValue(newMd) {
          if (!isHtml) {
            return String(newMd)
          }
          const lines = String(newMd)
            .trim()
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean)
            .map(l => renderInlineMarkdown(l))
          return lines.join('<br>')
        }
      })
      return
    }
    if (Array.isArray(node)) {
      node.forEach((item, idx) => walk(item, [...pathArr, String(idx)]))
      return
    }
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (pathArr.length === 0 && k.startsWith('_')) continue
        walk(v, [...pathArr, k])
      }
    }
  }

  walk(rootObj, [])
  return widgetSlots
}

function setDeepPath(target, pathArr, value) {
  let cur = target
  for (let i = 0; i < pathArr.length - 1; i++) {
    const key = Array.isArray(cur) ? Number(pathArr[i]) : pathArr[i]
    cur = cur[key]
  }
  const lastKey = Array.isArray(cur) ? Number(pathArr[pathArr.length - 1]) : pathArr[pathArr.length - 1]
  cur[lastKey] = value
}

/**
 * Safely normalize interactive widget copy objects inside inline <script> into
 * <script id="field-note-copy" type="application/json"> using Rollup's ESTree parser (zero regexes).
 */
export function normalizeWidgetsInHtml(rawHtml) {
  const $ = cheerio.load(rawHtml, { sourceCodeLocationInfo: true })
  if ($('script#field-note-copy[type="application/json"]').length > 0) {
    return { html: rawHtml, normalized: false }
  }

  const scriptEls = $('body script')
    .toArray()
    .filter(el => !el.attribs?.src && el.attribs?.type !== 'application/json')
  if (scriptEls.length === 0) {
    return { html: rawHtml, normalized: false }
  }

  const scriptEl = scriptEls[scriptEls.length - 1]
  const scriptLoc = scriptEl.sourceCodeLocation
  const jsSource = rawHtml.slice(scriptLoc.startTag.endOffset, scriptLoc.endTag.startOffset)
  const ast = parseAst(jsSource)

  // 1. Collect property names assigned to `.innerHTML` anywhere in the script AST
  const innerHtmlProps = new Set()
  function walkAst(node) {
    if (!node || typeof node !== 'object') return
    if (
      node.type === 'AssignmentExpression' &&
      node.left?.type === 'MemberExpression' &&
      node.left.property?.name === 'innerHTML' &&
      node.right?.type === 'MemberExpression' &&
      node.right.property?.type === 'Identifier'
    ) {
      innerHtmlProps.add(node.right.property.name)
    }
    for (const val of Object.values(node)) {
      if (Array.isArray(val)) val.forEach(walkAst)
      else if (val && typeof val === 'object' && val.type) walkAst(val)
    }
  }
  walkAst(ast)

  // 2. Extract top-level ObjectExpression-of-ObjectExpressions and ArrayExpression-of-ObjectExpressions
  const copyData = { _htmlFields: [] }
  const extractedVars = []
  let lastDeclEnd = null

  function extractObjectStrings(objNode, prefixArr) {
    const out = {}
    let count = 0
    for (const prop of objNode.properties || []) {
      if (prop.type !== 'Property' || prop.computed) continue
      const key = prop.key.type === 'Identifier' ? prop.key.name : String(prop.key.value)
      if (prop.value.type === 'Literal' && typeof prop.value.value === 'string') {
        out[key] = prop.value.value
        count++
        if (innerHtmlProps.has(key) || isLikelyHtmlWidgetValue(prop.value.value)) {
          const pattern = [prefixArr[0], '*', key].join('.')
          if (!copyData._htmlFields.includes(pattern)) {
            copyData._htmlFields.push(pattern)
          }
        }
      }
    }
    return count > 0 ? out : null
  }

  for (const stmt of ast.body) {
    if (stmt.type !== 'VariableDeclaration') continue
    for (const decl of stmt.declarations) {
      if (decl.id?.type !== 'Identifier' || !decl.init) continue
      const varName = decl.id.name

      if (decl.init.type === 'ObjectExpression') {
        const groupObj = {}
        let subCount = 0
        for (const prop of decl.init.properties) {
          if (prop.type !== 'Property' || prop.computed || prop.value.type !== 'ObjectExpression') continue
          const subKey = prop.key.type === 'Identifier' ? prop.key.name : String(prop.key.value)
          const extracted = extractObjectStrings(prop.value, [varName, subKey])
          if (extracted) {
            groupObj[subKey] = extracted
            subCount++
          }
        }
        if (subCount > 0) {
          copyData[varName] = groupObj
          extractedVars.push({ varName, kind: 'object' })
          lastDeclEnd = stmt.end
        }
      } else if (decl.init.type === 'ArrayExpression') {
        const items = []
        let itemCount = 0
        decl.init.elements.forEach((elNode, idx) => {
          if (elNode && elNode.type === 'ObjectExpression') {
            const extracted = extractObjectStrings(elNode, [varName, String(idx)])
            if (extracted) {
              items.push(extracted)
              itemCount++
            } else {
              items.push({})
            }
          }
        })
        if (itemCount > 0 && items.length === decl.init.elements.length) {
          copyData[varName] = items
          extractedVars.push({ varName, kind: 'array' })
          lastDeclEnd = stmt.end
        }
      }
    }
  }

  if (extractedVars.length === 0 || lastDeclEnd === null) {
    return { html: rawHtml, normalized: false }
  }

  const mergeLines = extractedVars.map(({ varName, kind }) => {
    if (kind === 'array') {
      return `      if (Array.isArray(copyData.${varName})) { copyData.${varName}.forEach(function(item, i) { if (${varName}[i] && item) Object.assign(${varName}[i], item); }); }`
    }
    return `      if (copyData.${varName}) { Object.keys(copyData.${varName}).forEach(function(k) { if (${varName}[k]) Object.assign(${varName}[k], copyData.${varName}[k]); }); }`
  })

  const hydrationSnippet = [
    '',
    '',
    '    /* Hydrate editable widget copy from #field-note-copy JSON */',
    '    (function hydrateFieldNoteCopy() {',
    "      var copyEl = document.getElementById('field-note-copy');",
    '      if (!copyEl) return;',
    '      try {',
    '        var copyData = JSON.parse(copyEl.textContent);',
    ...mergeLines.map(l => '  ' + l),
    '      } catch (err) { console.error(err); }',
    '    })();'
  ].join('\n')

  const updatedJsSource = jsSource.slice(0, lastDeclEnd) + hydrationSnippet + jsSource.slice(lastDeclEnd)
  // Strictly verify the patched JS still parses cleanly as an ESTree AST!
  parseAst(updatedJsSource)

  const jsonPayload = JSON.stringify(copyData, null, 2)
    .replace(/<\//g, '<\\/')
    .split('\n')
    .map(l => '    ' + l)
    .join('\n')
  const jsonScriptTag = `<script id="field-note-copy" type="application/json">\n${jsonPayload}\n  </script>\n\n  `

  const updatedHtml =
    rawHtml.slice(0, scriptLoc.startOffset) +
    jsonScriptTag +
    rawHtml.slice(scriptLoc.startOffset, scriptLoc.startTag.endOffset) +
    updatedJsSource +
    rawHtml.slice(scriptLoc.endTag.startOffset)

  return { html: updatedHtml, normalized: true }
}

/**
 * Format discovered slots into a clean Obsidian-friendly Markdown document.
 */
export function formatSlotsToMarkdown(slug, slots) {
  const chunks = [
    `<!-- thought-sync: ${slug} | Edit prose below and save to live-reload. Keep all slot markers intact. -->`
  ]

  for (const slot of slots) {
    if (slot.section) {
      chunks.push(`<!-- ─── ${slot.section} ─── -->`)
    }
    chunks.push(`<!-- slot: ${slot.id} -->\n${slot.markdown}`)
  }

  return chunks.join('\n\n') + '\n'
}

/**
 * Strictly parse and validate a slot Markdown document.
 * Rejects unclosed HTML comments, malformed `<!-- slot: ... -->` markers, duplicates,
 * unknown slots, missing slots, or empty required slots.
 */
export function parseAndValidateSlotMarkdown(markdownText, expectedSlotIds) {
  const text = String(markdownText).replace(/\r\n/g, '\n')

  // 1. Validate that every `<!--` has a matching `-->` and no nested `<!--`
  let searchIdx = 0
  while (true) {
    const openIdx = text.indexOf('<!--', searchIdx)
    if (openIdx === -1) break
    const closeIdx = text.indexOf('-->', openIdx + 4)
    const lineNum = text.slice(0, openIdx).split('\n').length
    if (closeIdx === -1) {
      throw new Error(`Malformed unclosed HTML comment starting on line ${lineNum}`)
    }
    const inner = text.slice(openIdx + 4, closeIdx)
    if (inner.includes('<!--')) {
      throw new Error(`Malformed nested HTML comment near line ${lineNum}`)
    }
    // Check if this comment looks like a slot marker attempt
    if (/^\s*slot\b/i.test(inner)) {
      if (!/^\s*slot:\s*[a-zA-Z0-9_.-]+\s*$/.test(inner)) {
        throw new Error(`Malformed slot marker on line ${lineNum}: <!--${inner}-->`)
      }
    }
    searchIdx = closeIdx + 3
  }

  // 2. Also ensure every `<!-- slot: ... -->` sits cleanly on its own line
  const lines = text.split('\n')
  const markerPositions = []
  let offset = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (/<!--\s*slot\b/i.test(line)) {
      const m = trimmed.match(/^<!--\s*slot:\s*([a-zA-Z0-9_.-]+)\s*-->$/)
      if (!m) {
        throw new Error(`Malformed slot marker on line ${i + 1}: "${line}"`)
      }
      markerPositions.push({
        id: m[1],
        line: i + 1,
        markerStart: offset,
        contentStart: offset + line.length + (i < lines.length - 1 ? 1 : 0)
      })
    }
    offset += line.length + 1
  }

  if (markerPositions.length === 0) {
    throw new Error('No <!-- slot: ... --> markers found in Markdown file')
  }

  // Check if non-comment text precedes the first slot marker
  const preamble = text.slice(0, markerPositions[0].markerStart).replace(/<!--[\s\S]*?-->/g, '').trim()
  if (preamble.length > 0) {
    throw new Error('Unexpected text before first <!-- slot: ... --> marker')
  }

  const slotMap = new Map()
  for (let i = 0; i < markerPositions.length; i++) {
    const cur = markerPositions[i]
    const nextStart = i + 1 < markerPositions.length ? markerPositions[i + 1].markerStart : text.length
    if (slotMap.has(cur.id)) {
      throw new Error(`Duplicate slot marker: <!-- slot: ${cur.id} --> (line ${cur.line})`)
    }
    // Strip non-slot HTML comments (like section divider comments) from slot body
    const rawSlice = text.slice(cur.contentStart, nextStart)
    const cleaned = rawSlice.replace(/<!--[\s\S]*?-->/g, '')
    const value = cleaned.replace(/^\n+|\n+$/g, '')
    if (value.trim().length === 0) {
      throw new Error(`Slot "${cur.id}" (line ${cur.line}) is empty`)
    }
    slotMap.set(cur.id, value)
  }

  const expectedSet = new Set(expectedSlotIds)
  const missing = expectedSlotIds.filter(id => !slotMap.has(id))
  if (missing.length > 0) {
    throw new Error(`Missing expected slot marker(s): ${missing.join(', ')}`)
  }

  const unknown = [...slotMap.keys()].filter(id => !expectedSet.has(id))
  if (unknown.length > 0) {
    throw new Error(`Unknown slot marker(s): ${unknown.join(', ')}`)
  }

  return slotMap
}

/**
 * Update `title:` and `excerpt:` in `thoughts/<slug>.md` YAML frontmatter without
 * mangling `date: YYYY-MM-DD` or rewrapping existing fields.
 */
export function updateFrontmatterFields(rawMarkdown, { title, excerpt }) {
  const parsed = matter(rawMarkdown)
  const currentTitle = parsed.data.title ?? ''
  const currentExcerpt = parsed.data.excerpt ?? ''
  if (currentTitle === title && currentExcerpt === excerpt) {
    return { content: rawMarkdown, changed: false }
  }

  const fmMatch = rawMarkdown.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n[\s\S]*|$)/)
  if (!fmMatch) {
    throw new Error('Could not locate YAML frontmatter block in companion .md file')
  }

  const fmBody = fmMatch[1]
  const rest = fmMatch[2] || ''
  const lines = fmBody.split(/\r?\n/)
  const entries = []
  for (const line of lines) {
    const keyMatch = line.match(/^([a-zA-Z0-9_-]+):/)
    if (keyMatch) {
      entries.push({ key: keyMatch[1], lines: [line] })
    } else if (entries.length > 0) {
      entries[entries.length - 1].lines.push(line)
    } else {
      entries.push({ key: null, lines: [line] })
    }
  }

  let hasTitle = false
  let hasExcerpt = false
  for (const entry of entries) {
    if (entry.key === 'title' && title !== undefined) {
      entry.lines = [`title: ${JSON.stringify(title)}`]
      hasTitle = true
    } else if (entry.key === 'excerpt' && excerpt !== undefined) {
      entry.lines = [`excerpt: ${JSON.stringify(excerpt)}`]
      hasExcerpt = true
    }
  }
  if (!hasTitle && title !== undefined) {
    entries.unshift({ key: 'title', lines: [`title: ${JSON.stringify(title)}`] })
  }
  if (!hasExcerpt && excerpt !== undefined) {
    entries.push({ key: 'excerpt', lines: [`excerpt: ${JSON.stringify(excerpt)}`] })
  }

  const updatedFm = entries.flatMap(e => e.lines).join('\n')
  const updatedRaw = `---\n${updatedFm}\n---${rest}`

  // Verify updated frontmatter parses cleanly with gray-matter
  const verify = matter(updatedRaw)
  if (title !== undefined && verify.data.title !== title) {
    throw new Error('Frontmatter verification failed for title')
  }
  if (excerpt !== undefined && verify.data.excerpt !== excerpt) {
    throw new Error('Frontmatter verification failed for excerpt')
  }

  return { content: updatedRaw, changed: true }
}

function normalizeSlug(slugInput) {
  return basename(String(slugInput).trim())
    .replace(/\.html$/i, '')
    .replace(/\.md$/i, '')
}

async function resolveThoughtPaths(slugInput, thoughtsDir = DEFAULT_THOUGHTS_DIR) {
  const slug = normalizeSlug(slugInput)
  const mdPath = join(thoughtsDir, `${slug}.md`)
  let htmlPath = join(thoughtsDir, `${slug}.html`)

  try {
    const rawMd = await readFile(mdPath, 'utf-8')
    const { data } = matter(rawMd)
    if (data.custom_html) {
      const resolvedThoughts = resolve(thoughtsDir)
      const candidate = resolve(resolvedThoughts, String(data.custom_html).trim())
      if (candidate.startsWith(resolvedThoughts + '/')) {
        htmlPath = candidate
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
  }

  await access(htmlPath)
  await access(mdPath)
  return { slug, htmlPath, mdPath }
}

export async function extractThought(
  slugInput,
  { outPath, normalizeWidgets = false, thoughtsDir = DEFAULT_THOUGHTS_DIR } = {}
) {
  const { slug, htmlPath } = await resolveThoughtPaths(slugInput, thoughtsDir)
  let rawHtml = await readFile(htmlPath, 'utf-8')

  let normalizedWidgets = false
  if (normalizeWidgets) {
    const res = normalizeWidgetsInHtml(rawHtml)
    if (res.normalized) {
      rawHtml = res.html
      await writeFile(htmlPath, rawHtml, 'utf-8')
      normalizedWidgets = true
    }
  }

  const { slots } = discoverSlots(rawHtml)
  const markdown = formatSlotsToMarkdown(slug, slots)

  if (outPath) {
    const resolvedOut = resolve(outPath)
    await mkdir(dirname(resolvedOut), { recursive: true })
    await writeFile(resolvedOut, markdown, 'utf-8')
  }

  return {
    slug,
    htmlPath,
    outPath: outPath ? resolve(outPath) : null,
    slotCount: slots.length,
    normalizedWidgets,
    markdown
  }
}

export async function applyThought(
  slugInput,
  { inPath, markdown, thoughtsDir = DEFAULT_THOUGHTS_DIR, runBuild = true } = {}
) {
  const { slug, htmlPath, mdPath } = await resolveThoughtPaths(slugInput, thoughtsDir)
  const rawHtml = await readFile(htmlPath, 'utf-8')
  const rawCompanionMd = await readFile(mdPath, 'utf-8')
  const slotMarkdown = markdown !== undefined ? markdown : await readFile(resolve(inPath), 'utf-8')

  const { $, slots, widgetJsonMeta } = discoverSlots(rawHtml)
  const expectedIds = slots.map(s => s.id)

  // Validate all markers BEFORE touching any file on disk
  const slotValues = parseAndValidateSlotMarkdown(slotMarkdown, expectedIds)

  const replacements = []
  let plainTitle = null
  let plainExcerpt = null
  let widgetChanged = false

  for (const slot of slots) {
    const newMd = slotValues.get(slot.id)
    if (slot.kind === 'widget-json') {
      const newVal = slot.renderValue(newMd)
      if (newVal !== slot.originalValue) {
        setDeepPath(widgetJsonMeta.parsedJson, slot.pathArr, newVal)
        widgetChanged = true
      }
      continue
    }

    const rendered = slot.render(newMd)
    if (rendered !== slot.originalRaw) {
      replacements.push({
        startOffset: slot.startOffset,
        endOffset: slot.endOffset,
        text: rendered
      })
    }

    if (slot.id === 'hero.title') {
      plainTitle = slot.toPlainText(newMd)
    } else if (slot.id === 'hero.lead') {
      plainExcerpt = htmlToPlainText(renderInlineMarkdown(newMd))
    }
  }

  // Also keep <head> <title>, og:title, twitter:title synced when hero.title actually changes
  if (plainTitle !== null) {
    const parsedCompanion = matter(rawCompanionMd)
    if (parsedCompanion.data.title && parsedCompanion.data.title !== plainTitle) {
      const titleEl = $('head > title').first()[0]
      if (titleEl?.sourceCodeLocation?.startTag && titleEl?.sourceCodeLocation?.endTag) {
        const curHeadTitle = $(titleEl).text()
        const suffixMatch = curHeadTitle.match(/(\s*[—–|-]\s*Reuben Peter-Paul.*)$/)
        const suffix = suffixMatch ? suffixMatch[1] : ' — Reuben Peter-Paul'
        replacements.push({
          startOffset: titleEl.sourceCodeLocation.startTag.endOffset,
          endOffset: titleEl.sourceCodeLocation.endTag.startOffset,
          text: escapeAttr(`${plainTitle}${suffix}`).replace(/&quot;/g, '"')
        })
      }
      for (const sel of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
        const metaEl = $(sel).first()[0]
        const attrLoc = metaEl?.sourceCodeLocation?.attrs?.content
        if (attrLoc) {
          replacements.push({
            startOffset: attrLoc.startOffset,
            endOffset: attrLoc.endOffset,
            text: `content="${escapeAttr(plainTitle)}"`
          })
        }
      }
    }
  }

  if (widgetJsonMeta && widgetChanged) {
    const indentMatch = widgetJsonMeta.rawInner.match(/^\r?\n([ \t]*)\{/)
    const indent = indentMatch ? indentMatch[1] : '    '
    const trailMatch = widgetJsonMeta.rawInner.match(/(\r?\n[ \t]*)$/)
    const trail = trailMatch ? trailMatch[1] : '\n  '
    const formattedJson = JSON.stringify(widgetJsonMeta.parsedJson, null, 2)
      .replace(/<\//g, '<\\/')
      .split('\n')
      .map(l => indent + l)
      .join('\n')
    replacements.push({
      startOffset: widgetJsonMeta.startOffset,
      endOffset: widgetJsonMeta.endOffset,
      text: `\n${formattedJson}${trail}`
    })
  }

  // Apply splice replacements from back to front so offsets stay exact
  replacements.sort((a, b) => b.startOffset - a.startOffset)
  let updatedHtml = rawHtml
  for (const rep of replacements) {
    updatedHtml = updatedHtml.slice(0, rep.startOffset) + rep.text + updatedHtml.slice(rep.endOffset)
  }

  const htmlChanged = updatedHtml !== rawHtml
  if (htmlChanged) {
    await writeFile(htmlPath, updatedHtml, 'utf-8')
  }

  const fmUpdate = updateFrontmatterFields(rawCompanionMd, {
    title: plainTitle ?? undefined,
    excerpt: plainExcerpt ?? undefined
  })
  if (fmUpdate.changed) {
    await writeFile(mdPath, fmUpdate.content, 'utf-8')
  }

  if (runBuild) {
    const [{ buildThoughts }, { buildFeed }] = await Promise.all([
      import('./build-thoughts.js'),
      import('./build-feed.js')
    ])
    await buildThoughts()
    await buildFeed()
  }

  return {
    slug,
    htmlPath,
    mdPath,
    htmlChanged,
    frontmatterChanged: fmUpdate.changed,
    updatedSlotCount: replacements.length + (widgetChanged ? 1 : 0),
    plainTitle,
    plainExcerpt
  }
}

export async function watchThought(
  slugInput,
  { filePath, debounceMs = 180, thoughtsDir = DEFAULT_THOUGHTS_DIR } = {}
) {
  const { slug, htmlPath, mdPath } = await resolveThoughtPaths(slugInput, thoughtsDir)
  const resolvedFile = resolve(filePath)
  await access(resolvedFile)

  const targetDir = dirname(resolvedFile)
  const targetBase = basename(resolvedFile)

  let lastAppliedContent = await readFile(resolvedFile, 'utf-8')
  let debounceTimer = null
  let queue = Promise.resolve()
  let pendingRun = false

  const triggerSync = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      enqueueSync()
    }, debounceMs)
  }

  const enqueueSync = () => {
    if (pendingRun) return
    pendingRun = true
    queue = queue
      .then(async () => {
        pendingRun = false
        const startedAt = Date.now()
        let content = ''
        try {
          content = await readFile(resolvedFile, 'utf-8')
          if (content.trim().length === 0) {
            // Wait briefly in case an editor atomic truncate+write is mid-flight
            await new Promise(r => setTimeout(r, 60))
            content = await readFile(resolvedFile, 'utf-8')
          }
        } catch (err) {
          if (err.code === 'ENOENT') {
            await new Promise(r => setTimeout(r, 60))
            content = await readFile(resolvedFile, 'utf-8')
          } else {
            throw err
          }
        }

        if (content === lastAppliedContent) {
          return
        }

        const result = await applyThought(slug, {
          markdown: content,
          thoughtsDir,
          runBuild: true
        })
        lastAppliedContent = content
        const elapsed = Date.now() - startedAt
        console.log(
          `[thought-sync] ✓ Synced ${slug} in ${elapsed}ms (HTML ${result.htmlChanged ? 'updated' : 'unchanged'}, frontmatter ${result.frontmatterChanged ? 'updated' : 'unchanged'})`
        )
      })
      .catch(err => {
        pendingRun = false
        console.error(`[thought-sync] ⚠ Refused update (${slug} left untouched): ${err.message}`)
      })
  }

  console.log(`[thought-sync] Watching ${resolvedFile}`)
  console.log(`[thought-sync] Target HTML: ${htmlPath}`)
  console.log(`[thought-sync] Target frontmatter: ${mdPath}`)
  console.log(`[thought-sync] Debounce: ${debounceMs}ms · Save in Obsidian to update live preview.`)

  // Watch parent directory so atomic rename saves (Obsidian / iCloud) never drop the watcher
  const watcher = watchFs(targetDir, (eventType, filename) => {
    if (!filename || filename === targetBase) {
      triggerSync()
    }
  })

  return {
    close() {
      if (debounceTimer) clearTimeout(debounceTimer)
      watcher.close()
    }
  }
}

function parseCliArgs(argv) {
  const positional = []
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next
        i++
      } else {
        flags[key] = true
      }
    } else {
      positional.push(arg)
    }
  }
  return { positional, flags }
}

function printUsage() {
  console.log(`Usage:
  node scripts/thought-sync.mjs extract <slug> --out <md-path> [--normalize-widgets]
  node scripts/thought-sync.mjs apply <slug> --in <md-path>
  node scripts/thought-sync.mjs watch <slug> --file <md-path>`)
}

async function runCli() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2))
  const [subcommand, slug] = positional

  if (!subcommand || flags.help) {
    printUsage()
    process.exit(subcommand ? 0 : 1)
  }

  if (!slug) {
    console.error('Error: Missing <slug> argument.')
    printUsage()
    process.exit(1)
  }

  try {
    if (subcommand === 'extract') {
      const outPath = flags.out
      if (!outPath || typeof outPath !== 'string') {
        throw new Error('Missing required --out <md-path> option for extract')
      }
      const res = await extractThought(slug, {
        outPath,
        normalizeWidgets: Boolean(flags['normalize-widgets'])
      })
      console.log(
        `✓ Extracted ${res.slotCount} editable slots from thoughts/${res.slug}.html -> ${res.outPath}${res.normalizedWidgets ? ' (normalized widget copy to #field-note-copy)' : ''}`
      )
    } else if (subcommand === 'apply') {
      const inPath = flags.in || flags.file
      if (!inPath || typeof inPath !== 'string') {
        throw new Error('Missing required --in <md-path> option for apply')
      }
      const res = await applyThought(slug, { inPath })
      console.log(
        `✓ Applied ${res.slug} from ${resolve(inPath)} (HTML ${res.htmlChanged ? 'updated' : 'unchanged'}, frontmatter ${res.frontmatterChanged ? 'updated' : 'unchanged'})`
      )
    } else if (subcommand === 'watch') {
      const filePath = flags.file || flags.in
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Missing required --file <md-path> option for watch')
      }
      await watchThought(slug, { filePath, debounceMs: 180 })
    } else {
      throw new Error(`Unknown subcommand "${subcommand}"`)
    }
  } catch (err) {
    console.error(`[thought-sync] Error: ${err.message}`)
    process.exit(1)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await runCli()
}
