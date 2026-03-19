/**
 * Script to download and process GeoNames cities data into a compact JSON dataset.
 * Run: node scripts/build-cities.mjs
 *
 * Downloads cities with population > 5000 from GeoNames,
 * extracts relevant fields, and outputs to src/data/cities.json
 */
import { createWriteStream } from 'fs'
import { mkdir, writeFile, unlink } from 'fs/promises'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { pipeline } from 'stream/promises'
import { createUnzip } from 'zlib'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const GEONAMES_URL = 'https://download.geonames.org/export/dump/cities5000.zip'
const ZIP_PATH = join(ROOT, 'scripts', 'cities5000.zip')
const TXT_PATH = join(ROOT, 'scripts', 'cities5000.txt')
const OUT_PATH = join(ROOT, 'src', 'data', 'cities.json')

async function download(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download: ${res.status}`)
  const fileStream = createWriteStream(dest)
  // Use the web stream → node stream bridge
  const { Readable } = await import('stream')
  const nodeStream = Readable.fromWeb(res.body)
  await pipeline(nodeStream, fileStream)
}

async function unzip(zipPath, outDir) {
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)
  await execAsync(`unzip -o "${zipPath}" -d "${outDir}"`)
}

async function parseCities(txtPath) {
  const cities = []
  const rl = createInterface({
    input: createReadStream(txtPath, 'utf-8'),
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    const cols = line.split('\t')
    if (cols.length < 19) continue

    const name = cols[1] // asciiname (ASCII-safe)
    const lat = parseFloat(cols[4])
    const lng = parseFloat(cols[5])
    const country = cols[8]
    const region = cols[10] || ''
    const pop = parseInt(cols[14], 10) || 0
    const tz = cols[17] || ''

    if (!name || !tz || isNaN(lat) || isNaN(lng)) continue

    cities.push({
      name,
      region,
      country,
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      tz,
      pop,
    })
  }

  // Sort by population descending for ranking
  cities.sort((a, b) => b.pop - a.pop)
  return cities
}

async function main() {
  await mkdir(join(ROOT, 'scripts'), { recursive: true })
  await mkdir(join(ROOT, 'src', 'data'), { recursive: true })

  console.log('Downloading GeoNames cities5000.zip...')
  await download(GEONAMES_URL, ZIP_PATH)
  console.log(`Downloaded to ${ZIP_PATH}`)

  console.log('Extracting...')
  await unzip(ZIP_PATH, join(ROOT, 'scripts'))
  console.log(`Extracted to ${TXT_PATH}`)

  console.log('Parsing cities...')
  const cities = await parseCities(TXT_PATH)
  console.log(`Parsed ${cities.length} cities`)

  console.log(`Writing to ${OUT_PATH}...`)
  await writeFile(OUT_PATH, JSON.stringify(cities))
  console.log('Done!')

  // Clean up
  await unlink(ZIP_PATH).catch(() => {})
  await unlink(TXT_PATH).catch(() => {})
  console.log('Cleaned up temp files.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
