import { startActivityLogCleanupScheduler } from '../utils/activityLogger'

export default defineNitroPlugin((nitroApp) => {
  // Start the activity log cleanup scheduler when server starts
  console.log('Initializing activity log cleanup scheduler...')
  startActivityLogCleanupScheduler()
  
  // Handle server shutdown
  nitroApp.hooks.hook('close', () => {
    console.log('Stopping activity log cleanup scheduler...')
    // The scheduler will be stopped when the process exits
  })
})
