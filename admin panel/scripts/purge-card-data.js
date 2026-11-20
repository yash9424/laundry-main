/**
 * Removes stored card numbers, expiry dates and CVVs from customer records.
 *
 * The schema no longer carries these fields, so nothing new is written, but
 * values saved by earlier builds stay in the documents until they are taken
 * out. This does that, and only that: it unsets three keys inside
 * paymentMethods and leaves the method itself -- its type, the holder's name,
 * which card the customer meant -- exactly where it was.
 *
 * Safe to run more than once. Run it with the app's own environment so it
 * reaches the same database:
 *
 *   cd "/var/www/laundry-admin/admin panel"
 *   node --env-file=.env.production scripts/purge-card-data.js
 *
 * Add --dry-run to count what would change without changing it.
 */

const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry-run');
const FIELDS = ['cardNumber', 'expiryDate', 'cvv'];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Run with --env-file=.env.production');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const customers = mongoose.connection.collection('customers');

  // A document matters if any saved method still carries any of the three.
  const query = { $or: FIELDS.map((f) => ({ [`paymentMethods.${f}`]: { $exists: true } })) };

  const affected = await customers.countDocuments(query);
  console.log(`customers holding card data: ${affected}`);

  if (affected === 0) {
    console.log('nothing to purge');
    await mongoose.disconnect();
    return;
  }

  if (DRY_RUN) {
    console.log('dry run, nothing written');
    await mongoose.disconnect();
    return;
  }

  // $[] reaches every entry in the array without naming its index.
  const unset = {};
  for (const f of FIELDS) unset[`paymentMethods.$[].${f}`] = '';

  const result = await customers.updateMany(query, { $unset: unset });
  console.log(`documents updated: ${result.modifiedCount}`);

  const left = await customers.countDocuments(query);
  console.log(left === 0 ? 'verified: no card data remains' : `STILL PRESENT on ${left} document(s)`);

  await mongoose.disconnect();
  process.exit(left === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('purge failed:', err.message);
  process.exit(1);
});
