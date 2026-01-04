import { cleanupOldActivityLogs } from '../../utils/activityLogger'
import { logActivity } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  try {
    // Only admin can cleanup activity logs
    if (event.context.user?.role !== 'admin') {
      setResponseStatus(event, 403)
      return {
        success: false,
        message: 'Akses ditolak. Hanya admin yang dapat menghapus activity logs.',
      }
    }

    const deletedCount = await cleanupOldActivityLogs()

    // Log the cleanup activity
    await logActivity({
      event,
      action: 'DELETE',
      module: 'activity-logs',
      description: `Membersihkan ${deletedCount} activity logs yang lebih dari 1 minggu`,
      details: { deletedCount },
    })

    return {
      success: true,
      message: `Berhasil menghapus ${deletedCount} activity logs yang lebih dari 1 minggu`,
      data: { deletedCount },
    }
  } catch (error: any) {
    console.error('Error cleaning up activity logs:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Gagal membersihkan activity logs',
    }
  }
})
