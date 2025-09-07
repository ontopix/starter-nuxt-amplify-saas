import jwt from 'jsonwebtoken'

export async function getCurrentUser(event: any) {
  try {
    // Get Authorization header
    const authHeader = getHeader(event, 'authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // TEMPORARY: Return fake user for testing
      console.log('No auth header found, returning fake user for testing')
      return {
        userId: 'b245d4a4-f0a1-7041-9c53-1cddc3075f7e',
        email: 'real.null.sub@gmail.com',
        signInDetails: {
          loginId: 'real.null.sub@gmail.com'
        }
      }
    }

    // Extract JWT token
    const token = authHeader.substring(7)
    
    if (!token) {
      return null
    }

    // Decode JWT token (in production, verify signature)
    const decoded = jwt.decode(token) as any
    
    if (!decoded || !decoded.sub) {
      return null
    }

    return {
      userId: decoded.sub,
      email: decoded.email,
      signInDetails: {
        loginId: decoded.email || decoded.sub
      }
    }
  } catch (error) {
    console.error('Error extracting user from token:', error)
    return null
  }
}

export async function requireAuth(event: any) {
  const user = await getCurrentUser(event)
  
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }
  
  return user
}