import { db } from './database'
import { users } from './database/schema'
import * as dotenv from 'dotenv'
import bcrypt from 'bcrypt'

dotenv.config()

async function seedAdmin() {
    console.log('🌱 Seeding admin user...')

    try {
        const email = 'it@baliroyalhospital.co.id'
        const password = 'password'
        const hashedPassword = await bcrypt.hash(password, 10)

        const adminUser = await db.insert(users).values({
            name: 'IT Admin',
            username: 'it_admin',
            email: email,
            password: hashedPassword,
            role: 'admin',
        }).onConflictDoUpdate({
            target: users.email,
            set: {
                password: hashedPassword,
                role: 'admin',
                updatedAt: new Date(),
            }
        }).returning()

        console.log(`✅ Successfully created/updated admin user: ${adminUser[0].email}`)
        console.log('🔑 Credentials:')
        console.log(`   Email: ${email}`)
        console.log(`   Password: ${password}`)

    } catch (error) {
        console.error('❌ Error seeding admin user:', error)
        throw error
    } finally {
        process.exit(0)
    }
}

seedAdmin()
