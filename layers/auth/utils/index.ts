/**
 * Auth utility functions for session management and validation
 */

/**
 * Check if a route should be protected by authentication
 */
export const isProtectedRoute = (path: string): boolean => {
  const publicRoutes = [
    '/auth/login',
    '/auth/signup',
    '/auth/verify',
    '/auth/forgot-password',
    '/auth/reset-password'
  ]
  
  return !publicRoutes.some(route => path.startsWith(route))
}

/**
 * Check if a route is an auth route (login, signup, etc.)
 */
export const isAuthRoute = (path: string): boolean => {
  return path.startsWith('/auth')
}

/**
 * Get redirect URL after successful authentication
 */
export const getRedirectUrl = (query: Record<string, any>): string => {
  const redirect = query.redirect as string
  
  // Validate redirect URL to prevent open redirects
  if (!redirect || redirect.startsWith('http') || redirect.startsWith('//')) {
    return '/'
  }
  
  // Don't redirect back to auth pages
  if (isAuthRoute(redirect)) {
    return '/'
  }
  
  return redirect
}

/**
 * Format user display name from auth user
 */
export const getUserDisplayName = (user: any): string => {
  if (user?.attributes?.given_name && user?.attributes?.family_name) {
    return `${user.attributes.given_name} ${user.attributes.family_name}`
  }

  if (user?.attributes?.given_name) {
    return user.attributes.given_name
  }

  if (user?.attributes?.family_name) {
    return user.attributes.family_name
  }

  if (user?.attributes?.name) {
    return user.attributes.name
  }

  if (user?.attributes?.email) {
    return user.attributes.email.split('@')[0]
  }

  return 'User'
}

/**
 * Get user email from auth user
 */
export const getUserEmail = (user: any): string => {
  return user?.attributes?.email || ''
}

/**
 * Handle auth errors and return user-friendly messages
 */
export const handleAuthError = (error: any): string => {
  const errorMessage = error?.message || error?.toString() || 'An error occurred'
  
  // Map common AWS Cognito errors to user-friendly messages
  const errorMap: Record<string, string> = {
    'UserNotFoundException': 'No account found with this email address',
    'NotAuthorizedException': 'Invalid email or password',
    'UserNotConfirmedException': 'Please verify your email address before signing in',
    'InvalidPasswordException': 'Password does not meet requirements',
    'UsernameExistsException': 'An account with this email already exists',
    'CodeMismatchException': 'Invalid verification code',
    'ExpiredCodeException': 'Verification code has expired',
    'LimitExceededException': 'Too many attempts. Please try again later',
    'TooManyRequestsException': 'Too many requests. Please try again later',
    'InvalidParameterException': 'Invalid parameters provided'
  }
  
  // Check if error message contains any of the mapped errors
  for (const [key, value] of Object.entries(errorMap)) {
    if (errorMessage.includes(key)) {
      return value
    }
  }
  
  return errorMessage
}