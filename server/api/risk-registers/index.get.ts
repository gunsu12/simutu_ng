import { db } from '../../database'
import { riskRegisters, units, users, divisions } from '../../database/schema'
import { eq, and, or, ilike, desc, count, isNull, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user
    if (!user) {
      setResponseStatus(event, 401)
      return { success: false, message: 'Unauthorized' }
    }

    const query = getQuery(event)
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 10
    const offset = (page - 1) * limit
    const search = query.search ? String(query.search).trim() : ''
    const status = query.status ? String(query.status).trim() : ''
    const unitId = query.unitId ? String(query.unitId).trim() : ''
    const tahun = query.tahun ? Number(query.tahun) : null

    const whereConditions = [isNull(riskRegisters.deletedAt)]

    // Role-based visibility
    if (user.role !== 'admin' && user.role !== 'auditor') {
      if (user.role === 'manager' && user.employeeId) {
        // Fetch managed divisions
        const managedDivisions = await db
          .select({ id: divisions.id })
          .from(divisions)
          .where(eq(divisions.managerId, user.employeeId))
        const managedDivisionIds = managedDivisions.map(d => d.id)

        const managerFilters = [eq(units.headOfUnit, user.employeeId)]
        if (managedDivisionIds.length > 0) {
          managerFilters.push(inArray(units.divisionId, managedDivisionIds))
        }

        const managedUnits = await db
          .select({ id: units.id })
          .from(units)
          .where(or(...managerFilters))
        
        const managedUnitIds = managedUnits.map(u => u.id)
        if (managedUnitIds.length > 0) {
          whereConditions.push(inArray(riskRegisters.unitId, managedUnitIds))
        } else if (user.unitId) {
          whereConditions.push(eq(riskRegisters.unitId, user.unitId))
        } else {
          return {
            success: true,
            data: [],
            meta: { total: 0, page, limit, totalPages: 0 }
          }
        }
      } else {
        if (!user.unitId) {
          return {
            success: true,
            data: [],
            meta: { total: 0, page, limit, totalPages: 0 }
          }
        }
        whereConditions.push(eq(riskRegisters.unitId, user.unitId))
      }
    } else {
      // Admin/Auditor can filter by unitId
      if (unitId) {
        whereConditions.push(eq(riskRegisters.unitId, unitId))
      }
    }

    // Filter by status
    if (status) {
      whereConditions.push(eq(riskRegisters.status, status))
    }

    // Filter by tahun
    if (tahun) {
      whereConditions.push(eq(riskRegisters.tahun, tahun))
    }

    // Filter by search query
    if (search) {
      whereConditions.push(
        or(
          ilike(riskRegisters.risiko, `%${search}%`),
          ilike(riskRegisters.penyebab, `%${search}%`),
          ilike(riskRegisters.dampak, `%${search}%`),
          ilike(riskRegisters.mitigasi, `%${search}%`),
          ilike(riskRegisters.kategoriRisiko, `%${search}%`)
        )
      )
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(riskRegisters)
      .where(and(...whereConditions))

    const total = totalResult?.count || 0
    const totalPages = Math.ceil(total / limit)

    // Fetch data joined with unit and creator
    const data = await db
      .select({
        id: riskRegisters.id,
        siteId: riskRegisters.siteId,
        unitId: riskRegisters.unitId,
        unitName: units.name,
        tahun: riskRegisters.tahun,
        kategoriRisiko: riskRegisters.kategoriRisiko,
        risiko: riskRegisters.risiko,
        penyebab: riskRegisters.penyebab,
        dampak: riskRegisters.dampak,
        likelihood: riskRegisters.likelihood,
        severity: riskRegisters.severity,
        riskRating: riskRegisters.riskRating,
        levelRisiko: riskRegisters.levelRisiko,
        mitigasi: riskRegisters.mitigasi,
        status: riskRegisters.status,
        createdAt: riskRegisters.createdAt,
        creatorName: users.name,
      })
      .from(riskRegisters)
      .leftJoin(units, eq(riskRegisters.unitId, units.id))
      .leftJoin(users, eq(riskRegisters.createdBy, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(riskRegisters.createdAt))
      .limit(limit)
      .offset(offset)

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    }
  } catch (error: any) {
    console.error('Error fetching risk registers:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to fetch risk registers',
    }
  }
})
