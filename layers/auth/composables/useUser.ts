import type { AuthUser } from 'aws-amplify/auth'
import { getUserDisplayName, getUserEmail, handleAuthError } from '../utils'

export interface UserState {
  user: AuthUser | null
  userAttributes: Record<string, string> | null
  isAuthenticated: boolean
  authStep: string
  isLoading: boolean
  error: string | null
}

/**
 * Composable for managing user authentication and profile data using AWS Amplify
 * 
 * Provides reactive state and methods for handling user authentication flows and data.
 * This composable handles complete user lifecycle including authentication, profile management,
 * and multi-step auth flows with proper SSR support.
 * 
 * @example Basic Authentication
 * ```ts
 * const { signIn, isAuthenticated, displayName, email } = useUser()
 * 
 * // Sign in user
 * const result = await signIn('user@example.com', 'password123')
 * if (result.success) {
 *   console.log(`Welcome ${displayName.value}!`) // 'Welcome John Doe!'
 * }
 * ```
 * 
 * @example Profile Management  
 * ```ts
 * const { updateUserAttributes, userAttributes } = useUser()
 * 
 * // Update user profile
 * await updateUserAttributes({
 *   'given_name': 'John',
 *   'family_name': 'Smith',
 *   'custom:display_name': 'John Smith'
 * })
 * ```
 * 
 * @example Multi-step Authentication
 * ```ts
 * const { signIn, authStep } = useUser()
 * 
 * const result = await signIn(credentials)
 * if (authStep.value === 'challengeOTP') {
 *   // Handle OTP challenge
 *   console.log('Please enter your OTP code')
 * }
 * ```
 * 
 * @returns {Object} User authentication state and methods
 * @property {ComputedRef<AuthUser|null>} user - Current authenticated user object
 * @property {ComputedRef<Record<string,string>|null>} userAttributes - Cognito user attributes
 * @property {ComputedRef<boolean>} isAuthenticated - Whether user is authenticated
 * @property {ComputedRef<string>} authStep - Current auth step ('initial', 'authenticated', 'challengeOTP', etc.)
 * @property {ComputedRef<boolean>} isLoading - Loading state for async operations
 * @property {ComputedRef<string|null>} error - Error message if operation fails
 * @property {ComputedRef<string>} displayName - User's display name (computed from attributes)
 * @property {ComputedRef<string>} email - User's email address (computed from attributes)
 */
export const useUser = () => {
  const nuxtApp = useNuxtApp()

  // Use global state to ensure consistency across components
  const userState = useState<UserState>('user.state', () => ({
    user: null,
    userAttributes: null,
    isAuthenticated: false,
    authStep: 'initial',
    isLoading: false,
    error: null
  }))

  /**
   * Check if user is authenticated by validating session tokens
   * 
   * Uses AWS Amplify's fetchAuthSession to check if valid tokens exist.
   * This method is SSR-compatible and works on both server and client.
   * 
   * @returns {Promise<boolean>} True if user has valid session tokens
   * 
   * @example
   * ```ts
   * const { checkAuthSession } = useUser()
   * 
   * const isAuth = await checkAuthSession()
   * if (isAuth) {
   *   console.log('User is authenticated')
   * }
   * ```
   */
  const checkAuthSession = async (): Promise<boolean> => {
    try {
      const { Auth } = nuxtApp.$Amplify
      const session = await Auth.fetchAuthSession()
      return !!session.tokens
    } catch (error) {
      return false
    }
  }

  // Get current authenticated user
  // Fetch user attributes from Cognito
  const fetchUserAttributes = async () => {
    try {
      const { Auth } = nuxtApp.$Amplify
      const attributes = await Auth.fetchUserAttributes()
      userState.value.userAttributes = attributes
      return attributes
    } catch (error) {
      console.error('Error fetching user attributes:', error)
      return null
    }
  }

  const getCurrentUser = async (): Promise<AuthUser | null> => {
    try {
      userState.value.isLoading = true
      userState.value.error = null
      
      const { Auth } = nuxtApp.$Amplify
      
      // First check if there's a valid session
      const hasValidSession = await checkAuthSession()
      if (!hasValidSession) {
        userState.value.user = null
        userState.value.userAttributes = null
        userState.value.isAuthenticated = false
        userState.value.authStep = 'initial'
        return null
      }
      
      // Get user details if session is valid
      const user = await Auth.getCurrentUser()
      userState.value.user = user
      userState.value.isAuthenticated = true
      userState.value.authStep = 'authenticated'
      
      // Fetch user attributes
      await fetchUserAttributes()
      
      return user
      
    } catch (error) {
      // Any error from getCurrentUser means user is not authenticated
      // This is the correct and expected behavior from AWS Amplify
      userState.value.user = null
      userState.value.userAttributes = null
      userState.value.isAuthenticated = false
      userState.value.authStep = 'initial'
      userState.value.error = null // Clear any previous errors
      
      return null
    } finally {
      userState.value.isLoading = false
    }
  }

  /**
   * Sign in user with email/username and password
   * 
   * Handles basic sign-in and multi-step auth challenges like OTP/MFA.
   * Updates authStep state based on the sign-in response to handle challenges.
   * 
   * @param {string} username - User's email address or username
   * @param {string} password - User's password
   * @returns {Promise<{success: boolean, nextStep?: any, error?: string}>} Sign-in result
   * 
   * @example Basic Sign In
   * ```ts
   * const { signIn } = useUser()
   * 
   * const result = await signIn('user@example.com', 'password123')
   * if (result.success) {
   *   console.log('Successfully signed in!')
   * } else {
   *   console.error('Sign in failed:', result.error)
   * }
   * ```
   * 
   * @example Handling MFA Challenge
   * ```ts
   * const { signIn, authStep } = useUser()
   * 
   * const result = await signIn(username, password)
   * if (authStep.value === 'challengeOTP') {
   *   // User needs to provide OTP code
   *   showOTPInput()
   * }
   * ```
   */
  const signIn = async (username: string, password: string) => {
    try {
      userState.value.isLoading = true
      userState.value.error = null

      const { Auth } = nuxtApp.$Amplify
      const { isSignedIn, nextStep } = await Auth.signIn({ username, password })

      if (isSignedIn) {
        await getCurrentUser()
        userState.value.authStep = 'authenticated'
        return { success: true, nextStep }
      }

      // Handle auth challenges
      if (nextStep) {
        switch (nextStep.signInStep) {
          case 'CONFIRM_SIGN_IN_WITH_SMS_CODE':
          case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
            userState.value.authStep = 'challengeOTP'
            break
          case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
            userState.value.authStep = 'newPasswordRequired'
            break
          default:
            userState.value.authStep = 'initial'
        }
      }

      return { success: false, nextStep }
    } catch (error: any) {
      const errorMessage = handleAuthError(error)
      userState.value.error = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      userState.value.isLoading = false
    }
  }

  // Sign up user
  const signUp = async (username: string, password: string, attributes?: Record<string, string>) => {
    try {
      userState.value.isLoading = true
      userState.value.error = null

      const { Auth } = nuxtApp.$Amplify
      const result = await Auth.signUp({ 
        username, 
        password,
        options: attributes ? { userAttributes: attributes } : undefined
      })

      return { success: true, result }
    } catch (error: any) {
      userState.value.error = handleAuthError(error)
      return { success: false, error: userState.value.error }
    } finally {
      userState.value.isLoading = false
    }
  }

  // Sign out user
  const signOut = async (redirectTo: string = '/auth/login') => {
    try {
      userState.value.isLoading = true
      userState.value.error = null

      const { Auth } = nuxtApp.$Amplify
      await Auth.signOut()

      // Reset user state
      userState.value.user = null
      userState.value.userAttributes = null
      userState.value.isAuthenticated = false
      userState.value.authStep = 'initial'

      // Redirect to login page
      await navigateTo(redirectTo, { replace: true })

      return { success: true }
    } catch (error: any) {
      userState.value.error = handleAuthError(error)
      return { success: false, error: userState.value.error }
    } finally {
      userState.value.isLoading = false
    }
  }

  // Confirm sign up with verification code
  const confirmSignUp = async (username: string, confirmationCode: string) => {
    try {
      userState.value.isLoading = true
      userState.value.error = null

      const { Auth } = nuxtApp.$Amplify
      await Auth.confirmSignUp({ username, confirmationCode })

      return { success: true }
    } catch (error: any) {
      userState.value.error = handleAuthError(error)
      return { success: false, error: userState.value.error }
    } finally {
      userState.value.isLoading = false
    }
  }

  // Resend confirmation code
  const resendConfirmationCode = async (username: string) => {
    try {
      userState.value.isLoading = true
      userState.value.error = null

      const { Auth } = nuxtApp.$Amplify
      await Auth.resendSignUpCode({ username })

      return { success: true }
    } catch (error: any) {
      userState.value.error = handleAuthError(error)
      return { success: false, error: userState.value.error }
    } finally {
      userState.value.isLoading = false
    }
  }

  /**
   * Update user attributes in Amazon Cognito
   * 
   * Updates user profile information stored in Cognito User Pool.
   * Automatically refreshes userAttributes after successful update.
   * 
   * @param {Record<string, string>} attributes - Key-value pairs of attributes to update
   * @returns {Promise<{success: boolean, error?: string}>} Update result
   * 
   * @example Update Basic Profile
   * ```ts
   * const { updateUserAttributes } = useUser()
   * 
   * const result = await updateUserAttributes({
   *   'given_name': 'John',
   *   'family_name': 'Smith',
   *   'phone_number': '+1234567890'
   * })
   * 
   * if (result.success) {
   *   console.log('Profile updated successfully')
   * }
   * ```
   * 
   * @example Update Custom Attributes
   * ```ts
   * await updateUserAttributes({
   *   'custom:display_name': 'John Smith',
   *   'custom:company': 'Acme Corp',
   *   'custom:role': 'Admin'
   * })
   * ```
   */
  const updateUserAttributes = async (attributes: Record<string, string>) => {
    try {
      userState.value.isLoading = true
      userState.value.error = null

      const { Auth } = nuxtApp.$Amplify
      await Auth.updateUserAttributes({ userAttributes: attributes })

      // Refresh user attributes after update
      await fetchUserAttributes()

      return { success: true }
    } catch (error: any) {
      userState.value.error = handleAuthError(error)
      return { success: false, error: userState.value.error }
    } finally {
      userState.value.isLoading = false
    }
  }

  /**
   * Get raw session information
   * 
   * Returns the raw session object from AWS Amplify fetchAuthSession.
   * 
   * @returns {Promise<Object|null>} Raw session or null if not authenticated
   */
  const getSessionInfo = async () => {
    try {
      const { Auth } = nuxtApp.$Amplify
      const session = await Auth.fetchAuthSession()
      return session
    } catch (error) {
      console.error('Error fetching session info:', error)
      return null
    }
  }


  return {
    // State (computed refs from the reactive state)
    user: computed(() => userState.value.user),
    userAttributes: computed(() => userState.value.userAttributes),
    isAuthenticated: computed(() => userState.value.isAuthenticated),
    authStep: computed(() => userState.value.authStep),
    isLoading: computed(() => userState.value.isLoading),
    error: computed(() => userState.value.error),
    
    // Computed user display properties
    displayName: computed(() => userState.value.user ? getUserDisplayName(userState.value.user) : ''),
    email: computed(() => userState.value.user ? getUserEmail(userState.value.user) : ''),
    
    // Actions
    getCurrentUser,
    fetchUserAttributes,
    updateUserAttributes,
    checkAuthSession,
    getSessionInfo,
    signIn,
    signUp,
    signOut,
    confirmSignUp,
    resendConfirmationCode
  }
}