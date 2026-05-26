import 'dotenv/config'

import fs from 'node:fs/promises'
import path from 'node:path'
import OpenAI from 'openai'
import { buildTarotArtPromptSpecs } from '../src/data/tarot/cardArt'

const client = new OpenAI()

const OUTPUT_DIR = path.resolve(process.cwd(), 'public/tarot/generated')
const MANIFEST_FILE = path.resolve(process.cwd(), 'src/data/tarot/generatedCardArtManifest.ts')
const SIZE = '1024x1536'
const MODEL = 'gpt-image-1'

interface GenerateOptions {
  cardIds: Set<string> | null
  force: boolean
}

function parseArgs(argv: string[]): GenerateOptions {
  const idsArg = argv.find(arg => arg.startsWith('--cards='))
  const cardIds = idsArg
    ? new Set(idsArg.slice('--cards='.length).split(',').map(value => value.trim()).filter(Boolean))
    : null

  return {
    cardIds,
    force: argv.includes('--force'),
  }
}

async function ensureOutputDir(): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
}

async function generateImage(prompt: string): Promise<Buffer> {
  const result = await client.images.generate({
    model: MODEL,
    size: SIZE,
    prompt,
  })

  const imageBase64 = result.data?.[0]?.b64_json
  if (!imageBase64) {
    throw new Error('Image API returned no base64 payload')
  }

  return Buffer.from(imageBase64, 'base64')
}

async function writeManifest(entries: Array<{ cardId: string; outputPath: string }>): Promise<void> {
  const lines = entries
    .sort((left, right) => left.cardId.localeCompare(right.cardId))
    .map(entry => `  '${entry.cardId}': '${entry.outputPath}',`)

  const content = [
    'export const GENERATED_TAROT_CARD_ART_MANIFEST: Record<string, string> = {',
    ...lines,
    '}',
    '',
  ].join('\n')

  await fs.writeFile(MANIFEST_FILE, content, 'utf8')
}

async function syncManifestFromDisk(): Promise<void> {
  const files = await fs.readdir(OUTPUT_DIR)
  const entries = files
    .filter(fileName => fileName.endsWith('.png'))
    .map(fileName => ({
      cardId: fileName.replace(/\.png$/i, ''),
      outputPath: `/tarot/generated/${fileName}`,
    }))

  await writeManifest(entries)
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required to generate tarot art')
  }

  const options = parseArgs(process.argv.slice(2))
  const allSpecs = buildTarotArtPromptSpecs()
  const selectedSpecs = options.cardIds
    ? allSpecs.filter(spec => options.cardIds?.has(spec.cardId))
    : allSpecs

  if (selectedSpecs.length === 0) {
    throw new Error('No tarot cards matched the requested --cards filter')
  }

  await ensureOutputDir()

  const manifestEntries: Array<{ cardId: string; outputPath: string }> = []

  for (const spec of selectedSpecs) {
    const absoluteOutputPath = path.join(OUTPUT_DIR, `${spec.cardId}.png`)
    const alreadyExists = await fileExists(absoluteOutputPath)

    if (alreadyExists && !options.force) {
      console.log(`Skipping ${spec.cardId} — file already exists`)
      manifestEntries.push({ cardId: spec.cardId, outputPath: spec.outputPath })
      continue
    }

    console.log(`Generating ${spec.cardId}...`)
    const imageBuffer = await generateImage(spec.prompt)
    await fs.writeFile(absoluteOutputPath, imageBuffer)
    manifestEntries.push({ cardId: spec.cardId, outputPath: spec.outputPath })
  }

  if (!options.cardIds) {
    await writeManifest(manifestEntries)
  } else {
    await syncManifestFromDisk()
    console.log('Partial generation complete. Manifest synced from files on disk.')
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
