import type { AuthUser } from 'aws-amplify/auth'

export interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface AuthResponse {
  success: boolean
  error?: string
  nextStep?: any
  result?: any
}

export interface SignInParams {
  username: string
  password: string
}

export interface SignUpParams {
  username: string
  password: string
  attributes?: Record<string, string>
}

export interface ConfirmSignUpParams {
  username: string
  confirmationCode: string
}

export interface ResendCodeParams {
  username: string
}

export { type AuthUser }