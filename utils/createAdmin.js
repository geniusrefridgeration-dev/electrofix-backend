/**
 * Admin Create / Update Script
 * Run karo: node utils/createAdmin.js
 */

const path = require('path')
// .env file backend root se load karo (chahe kisi bhi directory se run karo)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const MONGO_URI = process.env.MONGO_URI
const EMAIL     = process.env.ADMIN_EMAIL    || 'admin@electrofix.com'
const PASSWORD  = process.env.ADMIN_PASSWORD || 'Admin@123'
const NAME      = process.env.ADMIN_NAME     || 'ElectroFix Admin'

// Inline Admin schema — koi external model dependency nahi
const adminSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role:     { type: String, default: 'admin' },
}, { timestamps: true })

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema)

async function run() {
  // Check MONGO_URI
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI not found in .env file!')
    console.error('   .env file check karo — MONGO_URI hona chahiye')
    process.exit(1)
  }

  console.log('🔗 Connecting to MongoDB...')
  console.log('   URI:', MONGO_URI.replace(/:([^:@]+)@/, ':****@'))  // hide password

  await mongoose.connect(MONGO_URI)
  console.log('✅ Connected!\n')

  // Hash password manually (pre-save hook nahi use karte yahan)
  const salt   = await bcrypt.genSalt(10)
  const hashed = await bcrypt.hash(PASSWORD, salt)

  const existing = await Admin.findOne({ email: EMAIL.toLowerCase() })

  if (existing) {
    await Admin.updateOne({ email: EMAIL.toLowerCase() }, { name: NAME, password: hashed })
    console.log('✅ Admin password UPDATED successfully!')
  } else {
    await Admin.create({ name: NAME, email: EMAIL.toLowerCase(), password: hashed })
    console.log('✅ Admin CREATED successfully!')
  }

  console.log('\n📋 Admin Credentials:')
  console.log(`   Email    : ${EMAIL}`)
  console.log(`   Password : ${PASSWORD}`)
  console.log('\n🚀 Admin panel mein login kar sakte hain!')
  await mongoose.disconnect()
  process.exit(0)
}

run().catch(err => {
  console.error('❌ Error:', err.message)
  console.error(err)
  process.exit(1)
})
