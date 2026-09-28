/**
 * One-off migration: move base64 images out of MongoDB documents into files.
 *
 * Every image field used to hold a "data:image/...;base64,..." string inside the
 * document. Orders carrying two pickup photos averaged ~600 KB each, which made
 * listing orders move megabytes. New writes are converted by lib/imageStore.ts;
 * this script handles the rows that already exist.
 *
 * Safe to run more than once: a value that is not a data URL is skipped.
 *
 *   node scripts/migrate-images-to-files.js            # dry run, changes nothing
 *   node scripts/migrate-images-to-files.js --apply    # actually writes
 *
 * Run it from the "admin panel" directory so public/uploads resolves, with the
 * same MONGODB_URI the app uses.
 */

const fs = require('fs/promises')
const path = require('path')
const crypto = require('crypto')
const mongoose = require('mongoose')

const APPLY = process.argv.includes('--apply')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/laundry'
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '')
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

const EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

const DATA_URL = /^data:([a-z0-9.+/-]+);base64,/i

// collection -> fields holding an image (or an array of them)
const TARGETS = {
  orders: ['pickupPhotos'],
  partners: ['profileImage', 'aadharImage', 'drivingLicenseImage'],
  customers: ['profileImage'],
  pricingitems: ['image'],
  pricingcategories: ['image'],
  subscriptionplans: ['image'],
}

let written = 0
let bytesFreed = 0
let skippedUnknownType = 0

async function toFile(value) {
  if (typeof value !== 'string' || !value) return null
  const match = value.match(DATA_URL)
  if (!match) return null

  const extension = EXTENSION_BY_MIME[match[1].toLowerCase()]
  if (!extension) {
    skippedUnknownType++
    return null
  }

  const buffer = Buffer.from(value.slice(match[0].length), 'base64')
  if (!buffer.length) return null

  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`
  if (APPLY) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer)
  }

  written++
  bytesFreed += value.length
  return `${BASE_URL}/uploads/${filename}`
}

async function migrateCollection(name, fields) {
  const collection = mongoose.connection.db.collection(name)
  const query = { $or: fields.map((field) => ({ [field]: { $exists: true, $ne: null } })) }
  const documents = await collection.find(query).toArray()

  let touchedDocuments = 0

  for (const document of documents) {
    const update = {}

    for (const field of fields) {
      const value = document[field]

      if (Array.isArray(value)) {
        const converted = await Promise.all(value.map(async (entry) => (await toFile(entry)) || entry))
        if (converted.some((entry, index) => entry !== value[index])) update[field] = converted
      } else {
        const converted = await toFile(value)
        if (converted) update[field] = converted
      }
    }

    if (Object.keys(update).length === 0) continue
    touchedDocuments++
    if (APPLY) await collection.updateOne({ _id: document._id }, { $set: update })
  }

  console.log(
    `  ${name.padEnd(20)} scanned=${String(documents.length).padStart(4)}  ` +
    `documents changed=${String(touchedDocuments).padStart(4)}`
  )
}

async function main() {
  if (!BASE_URL) {
    console.error('NEXT_PUBLIC_API_URL is not set. Stored URLs would have no host,')
    console.error('which breaks images in the mobile apps. Set it and run again.')
    process.exit(1)
  }

  console.log(APPLY ? 'APPLYING CHANGES' : 'DRY RUN - nothing will be written (pass --apply to commit)')
  console.log('base url  :', BASE_URL)
  console.log('uploads   :', UPLOAD_DIR)
  console.log('')

  await mongoose.connect(MONGODB_URI)

  for (const [name, fields] of Object.entries(TARGETS)) {
    await migrateCollection(name, fields)
  }

  console.log('')
  console.log(`images ${APPLY ? 'written' : 'that would be written'}: ${written}`)
  console.log(`document weight removed: ${(bytesFreed / 1048576).toFixed(2)} MB`)
  if (skippedUnknownType) console.log(`skipped (not a known image type): ${skippedUnknownType}`)

  await mongoose.disconnect()
}

main().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
