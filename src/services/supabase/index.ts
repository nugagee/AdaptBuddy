export {
  getCurrentUser,
  getProfile,
  signOut,
  getSupabaseClient,
  isSupabaseConfigured,
} from './client';
export type { Profile, UserRole } from './client';
export type { SignupDetails } from './authService';
export {
  getPostSignupRoute,
  requestSignupOtp,
  resendSignupOtp,
  upsertUserProfile,
  verifySignupOtp,
} from './authService';
