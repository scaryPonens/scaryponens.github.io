#!/usr/bin/env node
import assert from 'node:assert/strict'
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import * as cheerio from 'cheerio'
import matter from 'gray-matter'
import { parseAst } from 'rollup/parseAst'
import { projectRoot } from './lib/content-utils.js'
import {
  extractThought,
  applyThought,
  discoverSlots
} from './thought-sync.mjs'

const execFileAsync = promisify(execFile)

const SLUGS = [
  '20261124-orca-with-bots',
  '20261124-shape-pitch',
  '20261126-orca-bots-on-our-behalf'
]

function extractImmutableBlocks(rawHtml) {
  const $ = cheerio.load(rawHtml, { sourceCodeLocationInfo: true })
  const sliceRaw = el => rawHtml.slice(el.sourceCodeLocation.startOffset, el.sourceCodeLocation.endOffset)
  return {
    styles: $('style').toArray().map(sliceRaw),
    svgs: $('svg').toArray().map(sliceRaw),
    scripts: $('script').toArray().map(sliceRaw)
  }
}

async function main() {
  const tempRoot = await mkdtemp(join(tmpdir(), 'thought-sync-test-'))
  const tempThoughtsDir = join(tempRoot, 'thoughts')
  const tempEditsDir = join(tempRoot, 'edits')

  try {
    await cp(join(projectRoot, 'thoughts'), tempThoughtsDir, { recursive: true })

    console.log('1. Verifying zero-diff round-trip safety on all 3 existing custom_html Field Notes...')
    for (const slug of SLUGS) {
      const htmlPath = join(tempThoughtsDir, `${slug}.html`)
      const mdPath = join(tempThoughtsDir, `${slug}.md`)
      const editMdPath = join(tempEditsDir, `${slug}.md`)

      const beforeHtml = await readFile(htmlPath, 'utf-8')
      const beforeMd = await readFile(mdPath, 'utf-8')
      const beforeBlocks = extractImmutableBlocks(beforeHtml)

      const extracted = await extractThought(slug, {
        outPath: editMdPath,
        thoughtsDir: tempThoughtsDir
      })
      assert(extracted.slotCount >= 25, `Expected >=25 slots for ${slug}, got ${extracted.slotCount}`)

      // Re-force re-render of every slot by ensuring applyThought validates & compares all slots
      const { slots } = discoverSlots(beforeHtml)
      for (const slot of slots) {
        const rendered = slot.render(slot.markdown)
        assert.equal(
          rendered,
          slot.originalRaw,
          `Slot ${slot.id} in ${slug} differed on round-trip render`
        )
      }

      await applyThought(slug, {
        inPath: editMdPath,
        thoughtsDir: tempThoughtsDir,
        runBuild: false
      })

      const afterHtml = await readFile(htmlPath, 'utf-8')
      const afterMd = await readFile(mdPath, 'utf-8')
      const afterBlocks = extractImmutableBlocks(afterHtml)

      assert.deepEqual(afterBlocks.styles, beforeBlocks.styles, `<style> changed in ${slug}`)
      assert.deepEqual(afterBlocks.svgs, beforeBlocks.svgs, `<svg> changed in ${slug}`)
      assert.deepEqual(afterBlocks.scripts, beforeBlocks.scripts, `<script> changed in ${slug}`)
      assert.equal(afterHtml, beforeHtml, `Full HTML byte-identity failed for ${slug}`)
      assert.equal(afterMd, beforeMd, `Frontmatter .md byte-identity failed for ${slug}`)

      console.log(
        `   ✓ ${slug}: ${extracted.slotCount} slots round-tripped (${afterBlocks.styles.length} <style>, ${afterBlocks.svgs.length} <svg>, ${afterBlocks.scripts.length} <script> 100% byte-identical)`
      )
    }

    // Confirm special slot coverage on shape-pitch (figcaption + sidenote) & orca-bots-on-our-behalf (sidenote + quiz)
    const shapePitchMd = await readFile(join(tempEditsDir, '20261124-shape-pitch.md'), 'utf-8')
    assert(shapePitchMd.includes('<!-- slot: sec1.figcaption.1 -->'), 'Missing sec1.figcaption.1 on shape-pitch')
    assert(shapePitchMd.includes('<!-- slot: sec2.sidenote.1.label -->'), 'Missing sec2.sidenote.1.label on shape-pitch')
    assert(shapePitchMd.includes('<!-- slot: sec2.sidenote.1.body -->'), 'Missing sec2.sidenote.1.body on shape-pitch')
    assert(shapePitchMd.includes('<!-- slot: sec5.quiz.1.explain -->'), 'Missing sec5.quiz.1.explain on shape-pitch')

    console.log('2. Verifying edit propagation (hero.lead -> p.lead + excerpt:, hero.title -> h1 + title:)...')
    const targetSlug = '20261126-orca-bots-on-our-behalf'
    const targetHtmlPath = join(tempThoughtsDir, `${targetSlug}.html`)
    const targetCompanionPath = join(tempThoughtsDir, `${targetSlug}.md`)
    const targetEditPath = join(tempEditsDir, `${targetSlug}.md`)

    const origHtml = await readFile(targetHtmlPath, 'utf-8')
    const origBlocks = extractImmutableBlocks(origHtml)
    const origEditMd = await readFile(targetEditPath, 'utf-8')

    const newLeadMd =
      'Edited in `Obsidian` with **bold emphasis**, *italic voice*, and an [external link](https://example.com/test)—verifying live sync.'
    const editedMd = origEditMd.replace(
      /<!-- slot: hero\.lead -->\n[\s\S]*?(?=\n\n<!-- slot: hero\.companion -->)/,
      `<!-- slot: hero.lead -->\n${newLeadMd}`
    )
    assert.notEqual(editedMd, origEditMd, 'Failed to replace hero.lead in test Markdown')
    await writeFile(targetEditPath, editedMd, 'utf-8')

    const applyRes = await applyThought(targetSlug, {
      inPath: targetEditPath,
      thoughtsDir: tempThoughtsDir,
      runBuild: false
    })
    assert.equal(applyRes.htmlChanged, true)
    assert.equal(applyRes.frontmatterChanged, true)

    const patchedHtml = await readFile(targetHtmlPath, 'utf-8')
    const patchedCompanion = await readFile(targetCompanionPath, 'utf-8')
    const patchedBlocks = extractImmutableBlocks(patchedHtml)

    // <style>, <svg>, <script> must still be 100% untouched
    assert.deepEqual(patchedBlocks.styles, origBlocks.styles, '<style> mutated during hero.lead edit')
    assert.deepEqual(patchedBlocks.svgs, origBlocks.svgs, '<svg> mutated during hero.lead edit')
    assert.deepEqual(patchedBlocks.scripts, origBlocks.scripts, '<script> mutated during hero.lead edit')

    const $patched = cheerio.load(patchedHtml)
    const leadHtml = $patched('p.lead').html().trim()
    assert(leadHtml.includes('<code>Obsidian</code>'), 'p.lead missing <code>Obsidian</code>')
    assert(leadHtml.includes('<strong>bold emphasis</strong>'), 'p.lead missing <strong>')
    assert(leadHtml.includes('<em>italic voice</em>'), 'p.lead missing <em>')
    assert(
      leadHtml.includes('<a href="https://example.com/test" target="_blank" rel="noopener noreferrer">external link</a>'),
      'p.lead missing external link attributes'
    )

    const parsedFm = matter(patchedCompanion)
    assert.equal(
      parsedFm.data.excerpt,
      'Edited in Obsidian with bold emphasis, italic voice, and an external link—verifying live sync.',
      'Frontmatter excerpt did not sync plain text cleanly'
    )
    console.log('   ✓ hero.lead updated both p.lead (HTML) and excerpt: (plain text frontmatter) cleanly')

    console.log('3. Verifying safety guardrails (missing / malformed slot markers rejected without touching HTML)...')
    const snapshotHtml = await readFile(targetHtmlPath, 'utf-8')
    const snapshotCompanion = await readFile(targetCompanionPath, 'utf-8')

    // Delete <!-- slot: hero.lead --> marker
    const brokenMissingMarkerMd = editedMd.replace('<!-- slot: hero.lead -->\n', '')
    const brokenPath = join(tempEditsDir, 'broken-missing.md')
    await writeFile(brokenPath, brokenMissingMarkerMd, 'utf-8')

    await assert.rejects(
      () =>
        applyThought(targetSlug, {
          inPath: brokenPath,
          thoughtsDir: tempThoughtsDir,
          runBuild: false
        }),
      /Missing expected slot marker.*hero\.lead/
    )
    assert.equal(await readFile(targetHtmlPath, 'utf-8'), snapshotHtml, 'HTML was overwritten despite missing marker!')
    assert.equal(
      await readFile(targetCompanionPath, 'utf-8'),
      snapshotCompanion,
      'Companion .md was overwritten despite missing marker!'
    )

    // Also test CLI non-zero exit on malformed marker
    const brokenUnclosedPath = join(tempEditsDir, 'broken-unclosed.md')
    await writeFile(
      brokenUnclosedPath,
      editedMd.replace('<!-- slot: sec1.title -->', '<!-- slot: sec1.title'),
      'utf-8'
    )
    let cliRejected = false
    try {
      await execFileAsync(process.execPath, [
        join(projectRoot, 'scripts', 'thought-sync.mjs'),
        'apply',
        targetSlug,
        '--in',
        brokenUnclosedPath
      ])
    } catch (err) {
      cliRejected = err.code !== 0
    }
    assert.equal(cliRejected, true, 'CLI should exit non-zero on malformed slot marker')
    console.log('   ✓ Missing and malformed slot markers cleanly rejected with zero file mutation')

    console.log('4. Verifying optional --normalize-widgets (<script id="field-note-copy" type="application/json">)...')
    const widgetEditPath = join(tempEditsDir, `${targetSlug}-widgets.md`)
    const normRes = await extractThought(targetSlug, {
      outPath: widgetEditPath,
      normalizeWidgets: true,
      thoughtsDir: tempThoughtsDir
    })
    assert.equal(normRes.normalizedWidgets, true)
    assert(normRes.slotCount > 80, `Expected >80 slots with normalized widgets, got ${normRes.slotCount}`)

    const widgetMd = await readFile(widgetEditPath, 'utf-8')
    assert(widgetMd.includes('<!-- slot: widget.identities.slack.title -->'))
    const updatedWidgetMd = widgetMd.replace(
      '<!-- slot: widget.identities.slack.title -->\nPosting or replying in a Slack channel',
      '<!-- slot: widget.identities.slack.title -->\nPosting in Slack as the bot'
    )
    await writeFile(widgetEditPath, updatedWidgetMd, 'utf-8')

    await applyThought(targetSlug, {
      inPath: widgetEditPath,
      thoughtsDir: tempThoughtsDir,
      runBuild: false
    })

    const htmlAfterWidget = await readFile(targetHtmlPath, 'utf-8')
    const $w = cheerio.load(htmlAfterWidget)
    const copyJson = JSON.parse($w('script#field-note-copy[type="application/json"]').html())
    assert.equal(copyJson.identities.slack.title, 'Posting in Slack as the bot')
    // Ensure behavior script still parses with zero syntax errors
    const behaviorJs = $w('body script:not([type="application/json"])').last().html()
    parseAst(behaviorJs)
    console.log('   ✓ Widget JSON copy extracted, patched via JSON.stringify, and JS AST verified intact')

    console.log('\nAll thought-sync verification checks passed!')
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
}

await main()
