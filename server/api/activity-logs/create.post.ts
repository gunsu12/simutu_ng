import { logActivity } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)
        const { action, module, description, details } = body

        await logActivity({
            event,
            action: action || 'VIEW',
            module: module || 'auth',
            description: description || 'No description',
            details: details,
            userId: body.userId,
            userName: body.userName,
            userEmail: body.userEmail
        })

        return { success: true }
    } catch (error) {
        // Fail silently to normal client app, but log on server console
        console.error('Failed to write client log:', error)
        return { success: false }
    }
})
