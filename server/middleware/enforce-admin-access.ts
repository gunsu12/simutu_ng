export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  const method = event.node.req.method || ''
  
  // Only apply to master data endpoints
  const masterDataEndpoints = [
    '/api/sites',
    '/api/divisions',
    '/api/units',
    '/api/employees',
    '/api/users'
  ]
  
  const isMasterDataEndpoint = masterDataEndpoints.some(endpoint => 
    url === endpoint || url.startsWith(endpoint + '/')
  )

  // Only check permissions on master data endpoints
  if (isMasterDataEndpoint) {
    const user = event.context.user
    // User must be authenticated
    if (!user) {
      setResponseStatus(event, 401)
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        data: {
          success: false,
          message: 'Unauthorized: No user found in context'
        }
      })
    }
    // Only admin can access master data
    if (user.role !== 'admin') {
      setResponseStatus(event, 403)
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        data: {
          success: false,
          message: 'Only administrators can access master data'
        }
      })
    }
  }
})
