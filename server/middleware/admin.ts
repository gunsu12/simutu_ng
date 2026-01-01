export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  
  // Only apply to DELETE requests on master data endpoints
  if (event.node.req.method === 'DELETE') {
    const masterDataEndpoints = [
      '/api/sites/',
      '/api/divisions/',
      '/api/units/',
      '/api/employees/',
      '/api/users/'
    ]
    
    const isAdminOnlyEndpoint = masterDataEndpoints.some(endpoint => url.startsWith(endpoint))
    
    if (isAdminOnlyEndpoint) {
      const user = event.context.user
      
      if (!user) {
        setResponseStatus(event, 401)
        return {
          success: false,
          message: 'Unauthorized',
        }
      }

      if (user.role !== 'admin') {
        setResponseStatus(event, 403)
        return {
          success: false,
          message: 'Only administrators can delete master data',
        }
      }
    }
  }
})
