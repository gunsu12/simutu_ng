import 'dotenv/config'
import { db } from '../database'
import { sites, divisions, employees, units } from '../database/schema'
import { sql } from 'drizzle-orm'

async function addSiteColumn() {
  try {
    console.log('Starting migration to add site_id columns...')
    
    // Check if there are any sites
    const allSites = await db.select().from(sites).limit(1)
    
    if (allSites.length === 0) {
      console.log('No sites found. Please create at least one site first.')
      process.exit(1)
    }
    
    const defaultSiteId = allSites[0].id
    console.log(`Using site ${allSites[0].name} as default (ID: ${defaultSiteId})`)
    
    // Add site_id column to divisions with default value
    await db.execute(sql`ALTER TABLE divisions ADD COLUMN IF NOT EXISTS site_id UUID`)
    await db.execute(sql`UPDATE divisions SET site_id = ${defaultSiteId} WHERE site_id IS NULL`)
    await db.execute(sql`ALTER TABLE divisions ALTER COLUMN site_id SET NOT NULL`)
    await db.execute(sql`ALTER TABLE divisions ADD CONSTRAINT divisions_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE`)
    
    console.log('✓ Added site_id to divisions')
    
    // Add site_id column to units with default value
    await db.execute(sql`ALTER TABLE units ADD COLUMN IF NOT EXISTS site_id UUID`)
    await db.execute(sql`UPDATE units SET site_id = ${defaultSiteId} WHERE site_id IS NULL`)
    await db.execute(sql`ALTER TABLE units ALTER COLUMN site_id SET NOT NULL`)
    await db.execute(sql`ALTER TABLE units ADD CONSTRAINT units_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE`)
    
    console.log('✓ Added site_id to units')
    
    // Add site_id column to employees with default value
    await db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS site_id UUID`)
    await db.execute(sql`UPDATE employees SET site_id = ${defaultSiteId} WHERE site_id IS NULL`)
    await db.execute(sql`ALTER TABLE employees ALTER COLUMN site_id SET NOT NULL`)
    await db.execute(sql`ALTER TABLE employees ADD CONSTRAINT employees_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE`)
    
    console.log('✓ Added site_id to employees')
    
    console.log('Migration completed successfully!')
    process.exit(0)
  } catch (error: any) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

addSiteColumn()
