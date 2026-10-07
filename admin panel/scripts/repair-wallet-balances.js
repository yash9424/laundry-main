/**
 * Repair wallet balances that are not numbers.
 *
 * The Redeem Points button divided by WalletSettings.pointsPerRupee. Once that
 * setting was 0, the new balance came out as Infinity, JSON turned it into null
 * on the way to the database, and the customer's money vanished. Worse, every
 * later `$inc` on a null balance throws, so buying a wallet plan afterwards
 * credited nothing at all.
 *
 * The Points system is gone now, so nothing can create this again. This script
 * cleans up the customers already affected.
 *
 *   node scripts/repair-wallet-balances.js            # report only
 *   node scripts/repair-wallet-balances.js --apply    # write the fix
 *
 * Run it from the "admin panel" directory with the same MONGODB_URI as the app.
 * It prints each customer it touches so the amounts can be checked against
 * their wallet transaction history before anything is paid back.
 */

const mongoose = require('mongoose')

const APPLY = process.argv.includes('--apply')
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/laundry'

async function main() {
  console.log(APPLY ? 'APPLYING CHANGES' : 'DRY RUN - nothing will be written (pass --apply to commit)')
  console.log('')

  await mongoose.connect(MONGODB_URI)
  const customers = mongoose.connection.db.collection('customers')
  const transactions = mongoose.connection.db.collection('wallettransactions')

  const broken = await customers.find({
    $or: [
      { walletBalance: null },
      { walletBalance: { $exists: false } },
      { walletBalance: { $type: 'string' } },
      { walletBalance: Number.POSITIVE_INFINITY },
    ],
  }).toArray()

  if (broken.length === 0) {
    console.log('No broken wallet balances found.')
    await mongoose.disconnect()
    return
  }

  console.log(`Customers with a non-numeric wallet balance: ${broken.length}\n`)

  for (const customer of broken) {
    // What the history says the balance was before it broke, so the amount owed
    // can be checked by a human rather than guessed by this script.
    const lastGood = await transactions
      .find({ customerId: String(customer._id), type: 'balance' })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray()

    console.log(`  ${customer.name || '(no name)'}  ${customer.mobile || ''}`)
    console.log(`    _id            : ${customer._id}`)
    console.log(`    walletBalance  : ${JSON.stringify(customer.walletBalance)}  ->  0`)
    if (lastGood.length) {
      console.log('    recent balance history:')
      for (const t of lastGood) {
        console.log(`      ${t.action} ${t.amount}  (${t.previousValue} -> ${t.newValue})  ${t.reason || ''}`)
      }
    } else {
      console.log('    recent balance history: none recorded')
    }

    if (APPLY) {
      await customers.updateOne({ _id: customer._id }, { $set: { walletBalance: 0 } })
      console.log('    reset to 0')
    }
    console.log('')
  }

  console.log(APPLY
    ? 'Done. These wallets now accept credits again. Refund what the history shows\n' +
      'each customer had, from Admin > Wallet > Adjust Balance, so it is recorded.'
    : 'Nothing was written. Re-run with --apply once the amounts above look right.')

  await mongoose.disconnect()
}

main().catch((error) => {
  console.error('Repair failed:', error)
  process.exit(1)
})
