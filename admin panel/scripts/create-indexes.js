/**
 * Creates the indexes the live queries need, on a running server, without a
 * deploy.
 *
 *   cd "/var/www/laundry-admin/admin panel" && node scripts/create-indexes.js
 *
 * The same set is declared on the Mongoose schemas, so a deploy creates them
 * too; this is for applying them straight away. It only ever *adds* indexes --
 * it reads no documents and writes none, and running it twice is harmless
 * (MongoDB ignores an index that already exists).
 *
 * Why they matter: nothing in models/ declared an index, so every poll from
 * every phone -- the customer app asks for its orders every two seconds, the
 * Captain app every ten -- was a full scan of the whole orders collection
 * followed by an in-memory sort. That is CPU the server spends again for every
 * order ever placed, on every tick, for every user.
 */
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')

/** Reads MONGODB_URI out of .env.local; `dotenv` is not a dependency here. */
function mongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI
  try {
    const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = env.match(/^\s*MONGODB_URI\s*=\s*(.+)$/m)
    if (match) return match[1].trim().replace(/^["']|["']$/g, '')
  } catch (error) {
    // Fall through to the local default.
  }
  return 'mongodb://localhost:27017/laundry'
}

const INDEXES = {
  orders: [
    // orderId is declared unique on the schema, so that index already exists.
    { keys: { customerId: 1, createdAt: -1 }, name: 'customerId_1_createdAt_-1' },
    { keys: { partnerId: 1, status: 1 }, name: 'partnerId_1_status_1' },
    { keys: { status: 1, createdAt: -1 }, name: 'status_1_createdAt_-1' },
    { keys: { createdAt: -1 }, name: 'createdAt_-1' },
    {
      keys: { 'pickupAddress.pincode': 1, status: 1 },
      name: 'pickupPincode_1_status_1',
    },
  ],
  wallettransactions: [
    { keys: { customerId: 1, createdAt: -1 }, name: 'customerId_1_createdAt_-1' },
  ],
  reviews: [{ keys: { orderId: 1 }, name: 'orderId_1' }],
  subscriptions: [
    { keys: { customerId: 1, createdAt: -1 }, name: 'customerId_1_createdAt_-1' },
  ],
  // Both apps poll this one; it has no Mongoose model, so the schema cannot
  // declare its indexes.
  notifications: [
    { keys: { audience: 1, sentAt: -1 }, name: 'audience_1_sentAt_-1' },
    { keys: { targetCustomerId: 1 }, name: 'targetCustomerId_1' },
  ],
}

async function main() {
  await mongoose.connect(mongoUri())
  const db = mongoose.connection.db
  console.log('Connected to', db.databaseName)

  for (const [collection, indexes] of Object.entries(INDEXES)) {
    for (const index of indexes) {
      try {
        const created = await db
          .collection(collection)
          .createIndex(index.keys, { name: index.name, background: true })
        console.log(`  ${collection}: ${created}`)
      } catch (error) {
        console.error(`  ${collection}: ${index.name} failed -- ${error.message}`)
      }
    }
  }

  // What each collection now has, so the result is visible without a second tool.
  for (const collection of Object.keys(INDEXES)) {
    const existing = await db.collection(collection).indexes()
    console.log(`\n${collection}:`, existing.map((i) => i.name).join(', '))
  }

  await mongoose.disconnect()
  console.log('\nDone.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
