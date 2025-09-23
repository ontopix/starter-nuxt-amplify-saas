import { ref, computed, onMounted } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { getCurrentUser, fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth/server'
import * as queries from '../../amplify/utils/graphql/queries'
import * as mutations from '../../amplify/utils/graphql/mutations'
import { runAmplifyApi, generateServerClient } from '../../amplify/utils/server'
import { handleAuthError } from '../utils'

// Create state factory function
const useUserState = () => {
  const isAuthenticated = ref(false)
  const authStep = ref('initial')
  const authSession = ref(null)
  const tokens = ref(null)
  const currentUser = ref(null)
  const userAttributes = ref(null)
  const userData = ref(null)
  const loading = ref(false)
  const error = ref(null)

  return {
    isAuthenticated,
    authStep,
    authSession,
    tokens,
    currentUser,
    userAttributes,
    userData,
    loading,
    error
  }
}

/**
 * Composable for managing user authentication and profile data using AWS Amplify
 *
 * Provides reactive state and methods for handling user authentication flows and data:
 *
 * @example Basic Usage
 * ```ts
 * const { signIn, isAuthenticated, userAttributes } = useUser()
 *
 * // Sign in
 * await signIn({
 *   username: 'user@example.com',
 *   password: 'password123'
 * })
 *
 * // Access user data
 * console.log(userAttributes.value.email)
 * ```
 *
 * @example Multi-Step Auth Flow
 * ```ts
 * const { signIn, confirmOTP, authStep } = useUser()
 *
 * await signIn(credentials)
 *
 * if (authStep.value === 'challengeOTP') {
 *   await confirmOTP('123456')
 * }
 *
 * @example Basic Server Usage
 * ```ts
 * const { fetchUser, isAuthenticated, userData } = useUserServer()
 *
 * await fetchUser(event)
 *
 * if (isAuthenticated.value) {
 *   ...
 * }
 * ```
 *
 * @returns {Object} User authentication state and methods
 * @property {ComputedRef<boolean>} isAuthenticated - Whether user is authenticated
 * @property {ComputedRef<string>} authStep - Current auth step ('initial', 'challengeOTP', 'challengeTOTPSetup', 'authenticated')
 * @property {ComputedRef<Object|null>} userAttributes - Cognito user attributes (email, name, etc)
 * @property {ComputedRef<Object|null>} authSession - Current authentication session
 * @property {ComputedRef<Object|null>} tokens - JWT tokens (access, ID, refresh)
 * @property {ComputedRef<Object|null>} currentUser - Current authenticated user object
 * @property {ComputedRef<boolean>} loading - Loading state for async operations
 * @property {ComputedRef<string|null>} error - Error message if operation fails
 * @method signUp - Register a new user and handle multi-step flow (client-side only)
 * @method signIn - Sign in user and handle auth challenges (client-side only)
 * @method confirmOTP - Complete OTP/TOTP challenge during sign in (client-side only)
 * @method signOut - Sign out the current user (client-side only)
 * @method updateAttributes - Update Cognito user attributes
 * @method fetchUser - Fetch latest user data information (client-side fetches full auth data, server-side fetches basic data)
 */

const _useUser = () => {
  // Create new state instance for this composable instance
  const userState = useUserState()

  /**
   * Sign up a new user and handle multi-step flow
   */
  const signUp = async (data) => {
    if (import.meta.server) {
      throw new Error('signUp can only be called on the client side')
    }

    userState.loading.value = true
    userState.error.value = null

    try {
      const result = await useNuxtApp().$Amplify.Auth.signUp(data)
      userState.authStep.value = result.nextStep?.signUpStep || 'authenticated'
      return result
    } catch (err) {
      console.error('Error signing up:', err)
      userState.error.value = handleAuthError(err)
      throw err
    } finally {
      userState.loading.value = false
    }
  }

  /**
   * Sign in user and handle auth challenges
   */
  const signIn = async (credentials) => {
    if (import.meta.server) {
      throw new Error('signIn can only be called on the client side')
    }

    userState.loading.value = true
    userState.error.value = null

    try {
      const result = await useNuxtApp().$Amplify.Auth.signIn(credentials)
      userState.currentUser.value = result.user

      // Handle auth challenges
      if (result.challengeName) {
        switch (result.challengeName) {
          case 'SMS_MFA':
          case 'SOFTWARE_TOKEN_MFA':
            userState.authStep.value = 'challengeOTP'
            break
          case 'MFA_SETUP':
            userState.authStep.value = 'challengeTOTPSetup'
            break
          default:
            userState.authStep.value = 'authenticated'
        }
      } else {
        userState.authStep.value = 'authenticated'
        await fetchUser()
      }

      return result
    } catch (err) {
      console.error('Error signing in:', err)
      userState.error.value = handleAuthError(err)
      throw err
    } finally {
      userState.loading.value = false
    }
  }

  /**
   * Confirm OTP/TOTP challenge
   */
  const confirmOTP = async (code) => {
    if (import.meta.server) {
      throw new Error('confirmOTP can only be called on the client side')
    }

    userState.loading.value = true
    userState.error.value = null

    try {
      const result = await useNuxtApp().$Amplify.Auth.confirmSignIn(code)
      userState.authStep.value = 'authenticated'
      await fetchUser()
      return result
    } catch (err) {
      console.error('Error confirming OTP:', err)
      userState.error.value = handleAuthError(err)
      throw err
    } finally {
      userState.loading.value = false
    }
  }

  /**
   * Reset password - send reset code to email
   */
  const resetPassword = async (username: string) => {
    if (import.meta.server) {
      throw new Error('resetPassword can only be called on the client side')
    }

    userState.loading.value = true
    userState.error.value = null

    try {
      const result = await useNuxtApp().$Amplify.Auth.resetPassword({ username })
      return { success: true, nextStep: result.nextStep }
    } catch (err) {
      console.error('Error resetting password:', err)
      userState.error.value = handleAuthError(err)
      return { success: false, error: handleAuthError(err) }
    } finally {
      userState.loading.value = false
    }
  }

  /**
   * Confirm password reset with code
   */
  const confirmResetPassword = async (username: string, confirmationCode: string, newPassword: string) => {
    if (import.meta.server) {
      throw new Error('confirmResetPassword can only be called on the client side')
    }

    userState.loading.value = true
    userState.error.value = null

    try {
      const result = await useNuxtApp().$Amplify.Auth.confirmResetPassword({
        username,
        confirmationCode,
        newPassword
      })
      return { success: true }
    } catch (err) {
      console.error('Error confirming password reset:', err)
      userState.error.value = handleAuthError(err)
      return { success: false, error: handleAuthError(err) }
    } finally {
      userState.loading.value = false
    }
  }

  /**
   * Sign out current user
   */
  const signOut = async () => {
    if (import.meta.server) {
      throw new Error('signOut can only be called on the client side')
    }

    userState.loading.value = true
    userState.error.value = null

    try {
      await useNuxtApp().$Amplify.Auth.signOut()
      userState.isAuthenticated.value = false
      userState.authStep.value = 'initial'
      userState.userAttributes.value = null
      userState.userData.value = null
      userState.authSession.value = null
      userState.tokens.value = null
      userState.currentUser.value = null
    } catch (err) {
      console.error('Error signing out:', err)
      userState.error.value = handleAuthError(err)
      throw err
    } finally {
      userState.loading.value = false
    }
  }

  /**
   * Update Cognito user attributes
   */
  const updateAttributes = async (attributes) => {
    userState.loading.value = true
    userState.error.value = null

    try {
      if (import.meta.client) {
        await useNuxtApp().$Amplify.Auth.updateUserAttributes(attributes)
        await fetchUser()
      }
      if (import.meta.server) {
        console.log('TODO: update attributes on server')
      }
    } catch (err) {
      console.error('Error updating attributes:', err)
      userState.error.value = handleAuthError(err)
      throw err
    } finally {
      userState.loading.value = false
    }
  }

  /**
   * Fetch user profile data from GraphQL
   */
  const fetchUserData = async (event?: H3Event<EventHandlerRequest>) => {
    if (!userState.isAuthenticated.value || !userState.userAttributes.value?.sub) {
      return
    }

    try {
      const userId = userState.userAttributes.value.sub

      if (import.meta.client) {
        const result = await useNuxtApp().$Amplify.GraphQL.client.graphql({
          query: queries.getUserProfile,
          variables: { id: userId }
        })
        userState.userData.value = result.data?.getUserProfile || null
      }

      if (import.meta.server) {
        const result = await runAmplifyApi(event, contextSpec =>
          contextSpec.client.graphql({
            query: queries.getUserProfile,
            variables: { id: userId }
          })
        )
        userState.userData.value = result.data?.getUserProfile || null
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
      userState.userData.value = null
    }
  }

  /**
   * Update user profile data via GraphQL
   */
  const updateUserData = async (profileData: any) => {
    if (!userState.isAuthenticated.value || !userState.userAttributes.value?.sub) {
      throw new Error('User not authenticated')
    }

    userState.loading.value = true
    userState.error.value = null

    try {
      const userId = userState.userAttributes.value.sub

      if (import.meta.client) {
        const result = await useNuxtApp().$Amplify.GraphQL.client.graphql({
          query: mutations.updateUserProfile,
          variables: {
            input: {
              id: userId,
              ...profileData
            }
          }
        })
        userState.userData.value = result.data?.updateUserProfile || null
      }

      if (import.meta.server) {
        const result = await runAmplifyApi(undefined, contextSpec =>
          contextSpec.client.graphql({
            query: mutations.updateUserProfile,
            variables: {
              input: {
                id: userId,
                ...profileData
              }
            }
          })
        )
        userState.userData.value = result.data?.updateUserProfile || null
      }
    } catch (err) {
      console.error('Error updating user data:', err)
      userState.error.value = handleAuthError(err)
      throw err
    } finally {
      userState.loading.value = false
    }
  }

  /**
   * Fetch all user data including session, tokens, and attributes
   */
  const fetchUser = async (event?: H3Event<EventHandlerRequest>) => {
    userState.loading.value = true
    userState.error.value = null

    try {
      if (import.meta.client) {
        // Get current auth session
        const authSession = await useNuxtApp().$Amplify.Auth.fetchAuthSession()
        userState.authSession.value = authSession
        userState.isAuthenticated.value = authSession.tokens !== undefined

        if (userState.isAuthenticated.value) {
          userState.tokens.value = authSession.tokens

          // Get current user
          const currentUser = await useNuxtApp().$Amplify.Auth.getCurrentUser()
          userState.currentUser.value = currentUser

          // Get user attributes
          const userAttributes = await useNuxtApp().$Amplify.Auth.fetchUserAttributes()
          userState.userAttributes.value = userAttributes

          // Get user data from GraphQL
          await fetchUserData(event)
        }
      }
      if (import.meta.server) {
        const authSession = await runAmplifyApi(event, contextSpec =>
          fetchAuthSession(contextSpec)
        )
        userState.authSession.value = authSession
        userState.isAuthenticated.value = authSession.tokens !== undefined

        if (userState.isAuthenticated.value) {
          userState.tokens.value = authSession.tokens
          userState.currentUser.value = await runAmplifyApi(event, contextSpec =>
            getCurrentUser(contextSpec)
          )
          userState.userAttributes.value = await runAmplifyApi(event, contextSpec =>
            fetchUserAttributes(contextSpec)
          )

          // Get user data from GraphQL
          await fetchUserData(event)
        }

        return {
          isAuthenticated: userState.isAuthenticated.value,
          authSession: userState.authSession.value,
          tokens: userState.tokens.value,
          currentUser: userState.currentUser.value,
          userAttributes: userState.userAttributes.value,
          userData: userState.userData.value
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
      userState.error.value = handleAuthError(err)
    } finally {
      userState.loading.value = false
    }
  }

  // Check auth state on mount
  if (import.meta.client) {
    onMounted(() => {
      fetchUser()
    })
  }

  return {
    // Readonly refs
    isAuthenticated: import.meta.client ? computed(() => userState.isAuthenticated.value) : userState.isAuthenticated,
    authStep: import.meta.client ? computed(() => userState.authStep.value) : userState.authStep,
    userAttributes: import.meta.client ? computed(() => userState.userAttributes.value) : userState.userAttributes,
    userData: import.meta.client ? computed(() => userState.userData.value) : userState.userData,
    authSession: import.meta.client ? computed(() => userState.authSession.value) : userState.authSession,
    tokens: import.meta.client ? computed(() => userState.tokens.value) : userState.tokens,
    currentUser: import.meta.client ? computed(() => userState.currentUser.value) : userState.currentUser,
    loading: import.meta.client ? computed(() => userState.loading.value) : userState.loading,
    error: import.meta.client ? computed(() => userState.error.value) : userState.error,
    // Methods
    signUp,
    signIn,
    confirmOTP,
    signOut,
    resetPassword,
    confirmResetPassword,
    updateAttributes,
    updateUserData,
    fetchUser,
    fetchUserData
  }
}

export const useUser = createSharedComposable(_useUser)

export const useUserServer = () => {
  if (import.meta.client) {
    throw new Error('useUserServer() should only be used on the server')
  }

  return _useUser()
}