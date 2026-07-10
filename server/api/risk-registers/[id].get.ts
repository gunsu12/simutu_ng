import { db } from '../../database'
import { riskRegisters, units, users, divisions } from '../../database/schema'
import { eq, and, isNull, inArray, or } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user
    if (!user) {
      setResponseStatus(event, 401)
      return { success: false, message: 'Unauthorized' }
    }

    const id = getRouterParam(event, 'id')
    if (!id) {
      setResponseStatus(event, 400)
      return { success: false, message: 'ID is required' }
    }

    const [risk] = await db
      .select({
        id: riskRegisters.id,
        siteId: riskRegisters.siteId,
        unitId: riskRegisters.unitId,
        unitName: units.name,
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
        createdBy: riskRegisters.createdBy,
        creatorName: users.name,
        approvedBy: riskRegisters.approvedBy,
        approvedAt: riskRegisters.approvedAt,
        rejectedNotes: riskRegisters.rejectedNotes,
        createdAt: riskRegisters.createdAt,
        updatedAt: riskRegisters.updatedAt,
      })
      .from(riskRegisters)
      .leftJoin(units, eq(riskRegisters.unitId, units.id))
      .leftJoin(users, eq(riskRegisters.createdBy, users.id))
      .where(and(eq(riskRegisters.id, id), isNull(riskRegisters.deletedAt)))
      .limit(1)

    if (!risk) {
      setResponseStatus(event, 404)
      return { success: false, message: 'Risk register tidak ditemukan' }
    }

    // Role-based visibility check
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
        if (!managedUnitIds.includes(risk.unitId) && risk.unitId !== user.unitId) {
          setResponseStatus(event, 403)
          return { success: false, message: 'Forbidden' }
        }
      } else {
        if (risk.unitId !== user.unitId) {
          setResponseStatus(event, 403)
          return { success: false, message: 'Forbidden' }
        }
      }
    }

    return {
      success: true,
      data: risk,
    }
  } catch (error: any) {
    console.error('Error fetching risk register detail:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to fetch risk register detail',
    }
  }
})
