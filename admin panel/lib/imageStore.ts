import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

/**
 * Images used to be kept inside the MongoDB documents as base64 data URLs.
 * A single order carrying two pickup photos weighed ~600 KB, so listing orders
 * moved megabytes on every request and the database grew with each photo.
 *
 * These helpers turn a data URL into a file under public/uploads and hand back
 * a URL to store instead. Anything that is already a URL is returned untouched,
 * so a document can be half-migrated without trouble.
 *
 * The URL is absolute on purpose. The mobile apps run from capacitor://localhost,
 * where a relative "/uploads/x.jpg" would resolve against the app itself and show
 * a broken image — including in builds already installed on people's phones,
 * which render these fields straight into <img src>. Absolute URLs keep those
 * working. The trade-off is that the stored value carries the domain, so moving
 * to a new domain means rewriting these fields.
 */

// Only real image types are written to disk. public/uploads is served directly
// by nginx from the same origin as the admin panel, so accepting arbitrary
// content there would be a stored-XSS hole.
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

const DATA_URL = /^data:([a-z0-9.+/-]+);base64,/i

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '')
}

/**
 * A data URL becomes a file and its URL is returned. Anything else — an existing
 * URL, an empty string, a non-string — comes back exactly as it went in.
 * If the write fails the original value is returned, so a disk problem can never
 * lose someone's photo.
 */
export async function persistImage<T>(value: T): Promise<T | string> {
  if (typeof value !== 'string' || !value) return value

  const match = value.match(DATA_URL)
  if (!match) return value

  const extension = EXTENSION_BY_MIME[match[1].toLowerCase()]
  if (!extension) return value

  try {
    const buffer = Buffer.from(value.slice(match[0].length), 'base64')
    if (!buffer.length) return value

    const directory = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(directory, { recursive: true })

    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`
    await writeFile(path.join(directory, filename), buffer)

    return `${baseUrl()}/uploads/${filename}`
  } catch (error) {
    console.error('persistImage: keeping the inline image, write failed:', error)
    return value
  }
}

/** persistImage across an array, for fields like Order.pickupPhotos. */
export async function persistImages(values: unknown): Promise<unknown> {
  if (!Array.isArray(values)) return persistImage(values)
  return Promise.all(values.map((value) => persistImage(value)))
}

/**
 * Walks the named fields of a payload and replaces any data URL with a stored
 * file. Mutates and returns the same object, which is what the routes want.
 */
export async function persistImageFields<T extends Record<string, any>>(
  payload: T,
  fields: string[],
): Promise<T> {
  if (!payload || typeof payload !== 'object') return payload

  for (const field of fields) {
    if (!(field in payload)) continue
    const value = payload[field]
    payload[field as keyof T] = (Array.isArray(value)
      ? await persistImages(value)
      : await persistImage(value)) as T[keyof T]
  }

  return payload
}
