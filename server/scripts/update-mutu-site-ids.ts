import 'dotenv/config'
import { db } from '../database'
import { indicatorCategories, indicators, sites } from '../database/schema'
import { eq, isNull } from 'drizzle-orm'

async function updateSiteIds() {
  try {
    console.log('Fetching first site...')
    
    // Get the first site
    const [firstSite] = await db.select().from(sites).limit(1)
    
    if (!firstSite) {
      console.log('No sites found. Please create a site first.')
      return
    }
    
    console.log(`Using site: ${firstSite.name} (${firstSite.id})`)
    
    // Update indicator_categories without site_id
    console.log('Updating indicator categories...')
    const updatedCategories = await db
      .update(indicatorCategories)
      .set({ siteId: firstSite.id })
      .where(isNull(indicatorCategories.siteId))
      .returning()
    
    console.log(`Updated ${updatedCategories.length} indicator categories`)
    
    // Update indicators without site_id
    console.log('Updating indicators...')
    const updatedIndicators = await db
      .update(indicators)
      .set({ siteId: firstSite.id })
      .where(isNull(indicators.siteId))
      .returning()
    
    console.log(`Updated ${updatedIndicators.length} indicators`)
    console.log('✓ All existing records have been assigned to the first site')
    
    process.exit(0)
  } catch (error) {
    console.error('Error updating site IDs:', error)
    process.exit(1)
  }
}

updateSiteIds()
