import { db } from './database'
import { sites, divisions, units, employees, users } from './database/schema'
import { eq } from 'drizzle-orm'
import * as dotenv from 'dotenv'
import bcrypt from 'bcrypt'

dotenv.config()

async function seed() {
  console.log('🌱 Seeding database...')

  try {
    // Insert sample sites
    const sampleSites = await db.insert(sites).values([
      {
        siteCode: 'SITE001',
        name: 'RS Pusat Jakarta',
        description: 'Rumah sakit pusat utama di Jakarta',
        address: 'Jl. Sudirman No. 123, Jakarta Pusat, DKI Jakarta 10210',
        email: 'info@rspusat-jkt.com',
        website: 'https://www.rspusat-jkt.com',
        phone: '021-12345678',
        fax: '021-87654321',
      },
      {
        siteCode: 'SITE002',
        name: 'RS Cabang Bandung',
        description: 'Cabang regional untuk wilayah Jawa Barat',
        address: 'Jl. Asia Afrika No. 45, Bandung, Jawa Barat 40111',
        email: 'bandung@rscabang.com',
        website: 'https://www.rscabang-bandung.com',
        phone: '022-87654321',
        fax: '022-12345678',
      },
      {
        siteCode: 'SITE003',
        name: 'RS Cabang Surabaya',
        description: 'Cabang regional untuk wilayah Jawa Timur',
        address: 'Jl. Pemuda No. 78, Surabaya, Jawa Timur 60271',
        email: 'surabaya@rscabang.com',
        website: 'https://www.rscabang-surabaya.com',
        phone: '031-55443322',
        fax: '031-22334455',
      },
      {
        siteCode: 'SITE004',
        name: 'Klinik Satelit Tangerang',
        description: 'Klinik satelit untuk layanan cepat',
        address: 'Jl. Raya Serpong No. 56, Tangerang Selatan, Banten 15310',
        email: 'tangerang@klinik-satelit.com',
        phone: '021-98765432',
      },
      {
        siteCode: 'SITE005',
        name: 'RS Cabang Semarang',
        description: 'Cabang regional untuk wilayah Jawa Tengah',
        address: 'Jl. Pandanaran No. 89, Semarang, Jawa Tengah 50134',
        email: 'semarang@rscabang.com',
        website: 'https://www.rscabang-semarang.com',
        phone: '024-11223344',
        fax: '024-44332211',
      },
    ]).returning()

    console.log(`✅ Successfully seeded ${sampleSites.length} sites`)

    // Get first site for relations
    const firstSite = sampleSites[0]

    // Insert divisions
    const sampleDivisions = await db.insert(divisions).values([
      {
        siteId: firstSite.id,
        code: 'DIV001',
        name: 'Medical Division',
        description: 'Handles all medical operations',
      },
      {
        siteId: firstSite.id,
        code: 'DIV002',
        name: 'Administrative Division',
        description: 'Handles administrative tasks',
      },
      {
        siteId: firstSite.id,
        code: 'DIV003',
        name: 'IT Division',
        description: 'Information Technology support',
      },
    ]).returning()

    console.log(`✅ Successfully seeded ${sampleDivisions.length} divisions`)

    // Insert employees first (without unit assignment)
    const sampleEmployees = await db.insert(employees).values([
      {
        siteId: firstSite.id,
        nik: 'EMP001',
        fullName: 'Dr. John Doe',
        identityNumber: '1234567890123456',
        phoneNumber: '+62812-3456-7890',
      },
      {
        siteId: firstSite.id,
        nik: 'EMP002',
        fullName: 'Jane Smith',
        identityNumber: '6543210987654321',
        phoneNumber: '+62813-4567-8901',
      },
      {
        siteId: firstSite.id,
        nik: 'EMP003',
        fullName: 'Michael Johnson',
        identityNumber: '1112223334445556',
        phoneNumber: '+62814-5678-9012',
      },
    ]).returning()

    console.log(`✅ Successfully seeded ${sampleEmployees.length} employees`)

    // Insert units
    const sampleUnits = await db.insert(units).values([
      {
        siteId: firstSite.id,
        divisionId: sampleDivisions[0].id,
        unitCode: 'UNIT001',
        name: 'Emergency Unit',
        description: 'Emergency medical services',
        location: 'Building A, Floor 1',
        headOfUnit: sampleEmployees[0].id,
      },
      {
        siteId: firstSite.id,
        divisionId: sampleDivisions[0].id,
        unitCode: 'UNIT002',
        name: 'Surgery Unit',
        description: 'Surgical operations',
        location: 'Building A, Floor 3',
        headOfUnit: null,
      },
      {
        siteId: firstSite.id,
        divisionId: sampleDivisions[1].id,
        unitCode: 'UNIT003',
        name: 'HR Unit',
        description: 'Human resources management',
        location: 'Building B, Floor 2',
        headOfUnit: sampleEmployees[1].id,
      },
    ]).returning()

    console.log(`✅ Successfully seeded ${sampleUnits.length} units`)

    // Update employees with unit assignments
    await db.update(employees)
      .set({ unitId: sampleUnits[0].id })
      .where(eq(employees.id, sampleEmployees[0].id))

    await db.update(employees)
      .set({ unitId: sampleUnits[2].id })
      .where(eq(employees.id, sampleEmployees[1].id))

    // Hash password for users
    const hashedPassword = await bcrypt.hash('password', 10)

    // Insert admin user
    const adminUser = await db.insert(users).values({
      name: 'Administrator',
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      employeeId: sampleEmployees[0].id,
      siteId: firstSite.id,
    }).returning()

    console.log(`✅ Successfully created admin user: ${adminUser[0].email}`)

    // Insert additional sample users
    const sampleUsers = await db.insert(users).values([
      {
        name: 'Jane Smith',
        username: 'janesmith',
        email: 'jane@example.com',
        password: hashedPassword,
        role: 'manager',
        employeeId: sampleEmployees[1].id,
        siteId: firstSite.id,
      },
      {
        name: 'Michael Johnson',
        username: 'michaelj',
        email: 'michael@example.com',
        password: hashedPassword,
        role: 'user',
        employeeId: sampleEmployees[2].id,
        siteId: firstSite.id,
      },
    ]).returning()

    console.log(`✅ Successfully seeded ${sampleUsers.length} additional users`)
    
    console.log('\n🎉 Database seeding completed!')
    console.log('\n📋 Summary:')
    console.log(`   - Sites: ${sampleSites.length}`)
    console.log(`   - Divisions: ${sampleDivisions.length}`)
    console.log(`   - Employees: ${sampleEmployees.length}`)
    console.log(`   - Units: ${sampleUnits.length}`)
    console.log(`   - Users: ${sampleUsers.length + 1} (including admin)`)
    console.log('\n🔑 Admin Credentials:')
    console.log(`   Email: admin@example.com`)
    console.log(`   Password: password`)
    
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    process.exit(0)
  }
}

seed()
