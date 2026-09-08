// Release the profile-authority and scoped-support SQL before deploying this build.
// Keep these checked in so an environment-variable change cannot activate them.
export const TRUSTED_ADULT_INVITATIONS_ENABLED: boolean = true;
export const SUPPORT_RECORDING_ENABLED: boolean = true;
export const DIRECT_ADULT_GUIDANCE = 'Please speak to a safe adult nearby or show them this screen. No email or text alert is sent by AdaptBuddy.';
