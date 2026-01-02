import { db } from '../database'
import { indicatorEntries } from '../database/schema'
import { like, desc } from 'drizzle-orm'

// Generate entry code in format NM/YYYYMMDD/0000X
export async function generateEntryCode(entryDate: Date): Promise<string> {
  const year = entryDate.getFullYear()
  const month = String(entryDate.getMonth() + 1).padStart(2, '0')
  const day = String(entryDate.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`
  
  // Find the last entry code for this date
  const lastEntry = await db
    .select()
    .from(indicatorEntries)
    .where(like(indicatorEntries.entryCode, `NM/${dateStr}/%`))
    .orderBy(desc(indicatorEntries.entryCode))
    .limit(1)

  let nextNumber = 1
  if (lastEntry.length > 0) {
    const lastCode = lastEntry[0].entryCode
    const lastNumber = parseInt(lastCode.split('/')[2]) || 0
    nextNumber = lastNumber + 1
  }

  const incrementalNumber = String(nextNumber).padStart(5, '0')
  return `NM/${dateStr}/${incrementalNumber}`
}
