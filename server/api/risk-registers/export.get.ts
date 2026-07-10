import { db } from '../../database'
import { riskRegisters, units, users, divisions } from '../../database/schema'
import { eq, and, or, ilike, desc, isNull, inArray } from 'drizzle-orm'
import ExcelJS from 'exceljs'

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user
    if (!user) {
      setResponseStatus(event, 401)
      return { success: false, message: 'Unauthorized' }
    }

    const query = getQuery(event)
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
          return { success: false, message: 'Forbidden' }
        }
      } else {
        if (!user.unitId) {
          return { success: false, message: 'Forbidden' }
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

    // Fetch risk registers joined with unit and creator
    const data = await db
      .select({
        id: riskRegisters.id,
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
        creatorName: users.name,
      })
      .from(riskRegisters)
      .leftJoin(units, eq(riskRegisters.unitId, units.id))
      .leftJoin(users, eq(riskRegisters.createdBy, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(riskRegisters.createdAt))

    // Create Excel Workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Risk Register')

    // Document Titles
    worksheet.mergeCells('A1:L1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = 'RISK REGISTER RUMAH SAKIT'
    titleCell.font = { size: 16, bold: true, color: { argb: 'FF1F2937' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet.getRow(1).height = 30

    worksheet.mergeCells('A2:L2')
    const subtitleCell = worksheet.getCell('A2')
    subtitleCell.value = `Periode Tahun: ${tahun || 'Semua Tahun'}`
    subtitleCell.font = { size: 11, italic: true, color: { argb: 'FF4B5563' } }
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet.getRow(2).height = 20

    worksheet.addRow([]) // empty row

    // Table Headers
    const headers = [
      'No', 
      'Unit Pelayanan', 
      'Kategori Risiko', 
      'Uraian Risiko (Kejadian)', 
      'Penyebab Risiko (Akar Masalah)', 
      'Dampak Risiko', 
      'Likelihood (L)', 
      'Severity (S)', 
      'Risk Rating (L x S)', 
      'Level Risiko', 
      'Upaya Mitigasi', 
      'Status'
    ]
    const headerRow = worksheet.addRow(headers)
    headerRow.height = 25

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' } // Royal Blue Header
      }
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'medium', color: { argb: 'FF9CA3AF' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      }
    })

    // Add Data Rows
    data.forEach((risk, index) => {
      const statusLabel = risk.status === 'approved' ? 'Disetujui' : risk.status === 'rejected' ? 'Ditolak' : 'Diajukan'
      const row = worksheet.addRow([
        index + 1,
        risk.unitName || '-',
        risk.kategoriRisiko || '-',
        risk.risiko || '-',
        risk.penyebab || '-',
        risk.dampak || '-',
        risk.likelihood,
        risk.severity,
        risk.riskRating,
        risk.levelRisiko,
        risk.mitigasi || '-',
        statusLabel
      ])
      
      row.height = 22

      // Row alignment and borders
      row.eachCell((cell, colNumber) => {
        // Zebra striping
        if (index % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' }
          }
        }

        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        }

        cell.font = { size: 9.5 }
        
        // Alignment formatting
        if ([1, 7, 8, 9, 10, 12].includes(colNumber)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
        }

        // Color coding for level risiko
        if (colNumber === 10) {
          cell.font = { bold: true }
          if (risk.levelRisiko === 'Tinggi') {
            cell.font = { color: { argb: 'FFDC2626' }, bold: true } // Red text
          } else if (risk.levelRisiko === 'Sedang') {
            cell.font = { color: { argb: 'FFD97706' }, bold: true } // Amber/Yellow text
          } else {
            cell.font = { color: { argb: 'FF16A34A' }, bold: true } // Green text
          }
        }

        // Color coding for status
        if (colNumber === 12) {
          cell.font = { bold: true }
          if (risk.status === 'approved') {
            cell.font = { color: { argb: 'FF16A34A' }, bold: true }
          } else if (risk.status === 'rejected') {
            cell.font = { color: { argb: 'FFDC2626' }, bold: true }
          } else {
            cell.font = { color: { argb: 'FFD97706' }, bold: true }
          }
        }
      })
    })

    // Set Column Widths
    worksheet.getColumn(1).width = 5   // No
    worksheet.getColumn(2).width = 20  // Unit
    worksheet.getColumn(3).width = 18  // Kategori
    worksheet.getColumn(4).width = 30  // Risiko
    worksheet.getColumn(5).width = 30  // Penyebab
    worksheet.getColumn(6).width = 25  // Dampak
    worksheet.getColumn(7).width = 10  // Likelihood
    worksheet.getColumn(8).width = 10  // Severity
    worksheet.getColumn(9).width = 12  // Rating
    worksheet.getColumn(10).width = 12 // Level
    worksheet.getColumn(11).width = 30 // Mitigasi
    worksheet.getColumn(12).width = 12 // Status

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    
    setResponseHeaders(event, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Risk_Register_Report_${tahun || 'All'}_${timestamp}.xlsx"`,
      'Cache-Control': 'no-cache',
    })

    return buffer
  } catch (error: any) {
    console.error('Export Excel error for Risk Register:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Gagal mengekspor file Excel',
    })
  }
})
