import { db } from './database'
import { sites } from './database/schema'
import * as dotenv from 'dotenv'

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

    console.log(`✅ Successfully seeded ${sampleSites.length} sites:`)
    sampleSites.forEach(site => {
      console.log(`   - ${site.siteCode}: ${site.name}`)
    })
    
    console.log('\n🎉 Database seeding completed!')
    
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    process.exit(0)
  }
}

seed()
