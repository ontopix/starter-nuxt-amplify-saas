import { loadAmplifyOutputs } from './utils/amplify'
import { loadJsonFile, fileExists } from './utils/files'
import { syncPlansFromStripe } from './seeders/plans'
import { seedUsers, type SeedUsersFile } from './seeders/users'

async function main() {
  const outputs = await loadAmplifyOutputs()
  const task = process.env.SEED_TASK ?? 'all'

  const usersPath = './amplify/seed/data/users.json'

  console.log(`🌱 Seeding task: ${task}`)

  // Check if users.json exists (only needed for user seeding)
  if ((task === 'users' || task === 'all') && !fileExists(usersPath)) {
    throw new Error(`Users file not found: ${usersPath}. Please create the file to seed users.`)
  }

  if (task === 'plans' || task === 'all') {
    console.log(`🔄 Syncing plans from Stripe API`)
    await syncPlansFromStripe()
    console.log(`✅ Plans synced from Stripe API successfully`)
  }

  if (task === 'users' || task === 'all') {
    console.log(`👥 Loading users from: ${usersPath}`)
    const users = await loadJsonFile<SeedUsersFile>(usersPath)
    await seedUsers(users)
    console.log(`✅ Users seeded successfully`)
  }

  console.log(`🎉 Seeding completed`)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exitCode = 1
})
