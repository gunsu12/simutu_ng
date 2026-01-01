import { db } from '../../database'
import { units, divisions, employees, sites } from '../../database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const allUnits = await db
      .select({
        id: units.id,
        siteId: units.siteId,
        unitCode: units.unitCode,
        divisionId: units.divisionId,
        name: units.name,
        description: units.description,
        location: units.location,
        headOfUnit: units.headOfUnit,
        createdAt: units.createdAt,
        updatedAt: units.updatedAt,
        siteName: sites.name,
        divisionName: divisions.name,
        headOfUnitName: employees.fullName,
      })
      .from(units)
      .leftJoin(sites, eq(units.siteId, sites.id))
      .leftJoin(divisions, eq(units.divisionId, divisions.id))
      .leftJoin(employees, eq(units.headOfUnit, employees.id))
      .orderBy(units.createdAt)
    
    return {
      success: true,
      data: allUnits,
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to fetch units',
    }
  }
})
