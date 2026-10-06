import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, GraduationCap, Heart, Sparkles, Smile, X } from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import { UserRole, isSupabaseConfigured, type UserGender, type UserSex } from 'services/supabase/client';
import { getPostSignupRoute, getRouteForUser, type SignupDetails } from 'services/supabase/authService';
import { useAuthStore } from 'store/authStore';
import { ROUTES } from 'constants/routes';
import {
  ADULT_LEARNER_MAX_AGE,
  ADULT_LEARNER_MIN_AGE,
  CHILD_MAX_AGE,
  CHILD_MIN_AGE,
  UK_GENDER_FIELD_HINT,
  UK_GENDER_FIELD_LABEL,
  UK_GENDER_OPTIONS,
  UK_SEX_FIELD_HINT,
  UK_SEX_FIELD_LABEL,
  UK_SEX_OPTIONS,
  isLearnerRole,
  isValidLearnerAgeForRole,
  parseLearnerAge,
  shouldSuggestAdultLane,
} from 'constants/signup';
import { toAuthErrorMessage } from 'services/supabase/authErrors';
import { isPasswordValid } from 'utils/passwordValidation';
import AuthBackground, { AuthLogo } from 'pages/auth/AuthBackground';
import PasswordRequirements from 'pages/auth/PasswordRequirements';
import OtpVerificationModal from 'pages/auth/OtpVerificationModal';
import {
  AuthField,
  AuthSelect,
  PasswordField,
  authCardClass,
  authErrorClass,
  authPrimaryBtnClass,
} from 'pages/auth/authForm';

const roles: {
  value: Exclude<UserRole, 'admin'>;
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'child',
    label: 'Child',
    hint: 'Ages 4–17',
    icon: <Smile className="h-6 w-6" aria-hidden />,
  },
  {
    value: 'adult',
    label: 'Adult learner',
    hint: '18+ independent',
    icon: <Sparkles className="h-6 w-6" aria-hidden />,
  },
  { value: 'parent', label: 'Parent', hint: 'Support circle', icon: <Heart className="h-6 w-6" aria-hidden /> },
  {
    value: 'teacher',
    label: 'Teacher',
    hint: 'Classroom tools',
    icon: <GraduationCap className="h-6 w-6" aria-hidden />,
  },
];

interface RoleSignupForm {
  firstName: string;
  lastName: string;
  childName: string;
  sex: UserSex | '';
  gender: UserGender | '';
  age: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const emptyRoleForm = (): RoleSignupForm => ({
  firstName: '',
  lastName: '',
  childName: '',
  sex: '',
  gender: '',
  age: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const initialFormsByRole = (): Record<UserRole, RoleSignupForm> => ({
  child: emptyRoleForm(),
  adult: emptyRoleForm(),
  parent: emptyRoleForm(),
  teacher: emptyRoleForm(),
  admin: emptyRoleForm(),
});

const namePlaceholders: Record<UserRole, { first: string; last: string }> = {
  child: { first: 'e.g. Alex', last: 'e.g. Morgan' },
  adult: { first: 'e.g. Jordan', last: 'e.g. Adeyemi' },
  parent: { first: 'e.g. Sarah', last: 'e.g. Johnson' },
  teacher: { first: 'e.g. James', last: 'e.g. Okonkwo' },
  admin: { first: 'e.g. Admin', last: 'e.g. User' },
};

function parseSignupRole(raw: string | null): UserRole {
  if (raw === 'child' || raw === 'adult' || raw === 'parent' || raw === 'teacher') return raw;
  return 'parent';
}

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { requestSignupVerification, verifySignupAndCreateProfile, resendSignupVerification, saveSignupProfile } =
    useAuth();
  const [role, setRole] = useState<UserRole>(() => parseSignupRole(searchParams.get('role')));
  const [formsByRole, setFormsByRole] = useState(initialFormsByRole);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [pendingSignup, setPendingSignup] = useState<SignupDetails | null>(null);
  const [laneNotice, setLaneNotice] = useState('');

  const form = formsByRole[role];
  const { firstName, lastName, childName, sex, gender, age, email, password, confirmPassword } = form;

  useEffect(() => {
    const fromQuery = parseSignupRole(searchParams.get('role'));
    setRole(fromQuery);
  }, [searchParams]);

  const updateForm = <K extends keyof RoleSignupForm>(field: K, value: RoleSignupForm[K]) => {
    setFormsByRole((prev) => ({
      ...prev,
      [role]: { ...prev[role], [field]: value },
    }));
  };

  const handleRoleChange = (nextRole: UserRole) => {
    if (nextRole === role) return;
    setRole(nextRole);
    setError('');
    setLaneNotice('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const switchToAdultLane = () => {
    const current = formsByRole.child;
    setFormsByRole((prev) => ({
      ...prev,
      adult: {
        ...prev.adult,
        firstName: current.firstName || prev.adult.firstName,
        lastName: current.lastName || prev.adult.lastName,
        sex: current.sex || prev.adult.sex,
        gender: current.gender || prev.adult.gender,
        age: current.age || prev.adult.age,
        email: current.email || prev.adult.email,
        password: current.password || prev.adult.password,
        confirmPassword: current.confirmPassword || prev.adult.confirmPassword,
      },
    }));
    setRole('adult');
    setLaneNotice('Switched to the Independent Buddy path — same tools, adult-paced support.');
    setError('');
  };

  const passwordValid = useMemo(() => isPasswordValid(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const confirmTouched = confirmPassword.length > 0;
  const confirmMismatch = confirmTouched && !passwordsMatch;

  const parsedAge = isLearnerRole(role) ? parseLearnerAge(age) : null;
  const ageValid =
    !isLearnerRole(role) || (parsedAge !== null && isValidLearnerAgeForRole(role, parsedAge));
  const ageTouched = isLearnerRole(role) && age.trim().length > 0;
  const ageInvalid = isLearnerRole(role) && ageTouched && !ageValid;
  const suggestAdult = role === 'child' && shouldSuggestAdultLane(parsedAge);

  const ageBounds =
    role === 'adult'
      ? { min: ADULT_LEARNER_MIN_AGE, max: ADULT_LEARNER_MAX_AGE }
      : { min: CHILD_MIN_AGE, max: CHILD_MAX_AGE };

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    sex !== '' &&
    gender !== '' &&
    ageValid &&
    passwordValid &&
    passwordsMatch &&
    !loading;

  const buildSignupDetails = (): SignupDetails => ({
    email: email.trim(),
    password,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    childName: childName.trim() || undefined,
    sex: sex as UserSex,
    gender: gender as UserGender,
    age: isLearnerRole(role) && parsedAge !== null ? parsedAge : undefined,
    role,
  });

  const finishSignup = (signupRole: UserRole) => {
    const { user, profile } = useAuthStore.getState();
    const destination =
      user && profile ? getRouteForUser(user, profile) : getPostSignupRoute(signupRole);

    navigate(destination, {
      replace: true,
      state: {
        message:
          signupRole === 'adult'
            ? 'Welcome to Independent Buddy — your adult learner space is ready.'
            : 'Welcome! Your account is ready.',
      },
    });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (!isSupabaseConfigured) {
      setError('Authentication is not configured. Add Supabase environment variables to continue.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const details = buildSignupDetails();
      const { needsOtpVerification, userId } = await requestSignupVerification(details);

      if (needsOtpVerification) {
        setPendingSignup(details);
        setOtpError('');
        setOtpModalOpen(true);
        return;
      }

      if (userId) {
        await saveSignupProfile(details, userId);
      }
      finishSignup(details.role);
    } catch (err: unknown) {
      setError(toAuthErrorMessage(err, 'Failed to create account'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    if (!pendingSignup) return;

    const signupRole = pendingSignup.role;
    const signupDetails = pendingSignup;

    setOtpLoading(true);
    setOtpError('');
    try {
      await verifySignupAndCreateProfile(signupDetails, otp);
      setOtpModalOpen(false);
      setPendingSignup(null);
      finishSignup(signupRole);
    } catch (err: unknown) {
      setOtpError(toAuthErrorMessage(err, 'Could not verify that code'));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingSignup) return;
    setOtpError('');
    try {
      await resendSignupVerification(pendingSignup.email);
    } catch (err: unknown) {
      setOtpError(toAuthErrorMessage(err, 'Could not resend the code'));
    }
  };

  const placeholders = namePlaceholders[role];
  const isAdultLane = role === 'adult';

  return (
    <AuthBackground variant="signup">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8 sm:px-6">
        <div className={`relative flex-1 overflow-hidden ${authCardClass}`}>
          {isAdultLane && (
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-400/20 blur-3xl" />
          )}
          <div className="relative mb-6 flex items-center justify-between">
            <AuthLogo />
            <Link to={ROUTES.LOGIN} className="text-sm font-semibold text-adapt-indigo hover:underline">
              Sign in
            </Link>
          </div>

        <h1 className="relative text-2xl font-bold text-adapt-navy dark:text-white">
          {isAdultLane ? 'Create your Independent Buddy space' : 'Create your account'}
        </h1>
        <p className="relative mt-2 text-sm text-slate-600 dark:text-gray-300">
          {isAdultLane
            ? 'Self-paced tools for neurodiverse adults and young adults — calm, clear, and in your control.'
            : 'Choose the space that fits you. You can always get support later.'}
        </p>

        <div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {roles.map((item) => {
            const active = role === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => handleRoleChange(item.value)}
                className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center transition ${
                  active
                    ? item.value === 'adult'
                      ? 'border-teal-500 bg-teal-50 text-teal-900 shadow-sm dark:border-teal-400 dark:bg-teal-950/40 dark:text-teal-100'
                      : 'border-adapt-indigo bg-indigo-50 text-adapt-indigo shadow-sm dark:border-adapt-cyan dark:bg-adapt-cyan/10 dark:text-adapt-cyan'
                    : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-gray-300'
                }`}
              >
                <span className={active ? '' : 'opacity-70'}>{item.icon}</span>
                <span className="text-xs font-bold leading-tight">{item.label}</span>
                <span className="text-[10px] font-medium opacity-70">{item.hint}</span>
              </button>
            );
          })}
        </div>

        {laneNotice && (
          <p className="relative mt-4 rounded-2xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:border-teal-500/30 dark:bg-teal-950/40 dark:text-teal-100">
            {laneNotice}
          </p>
        )}

        {isAdultLane && (
          <div className="relative mt-4 rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/90 to-cyan-50/60 p-4 text-sm text-slate-700 dark:border-teal-500/20 dark:from-teal-950/30 dark:to-slate-900 dark:text-gray-200">
            <p className="font-semibold text-teal-900 dark:text-teal-100">What Independent Buddy includes</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed">
              <li>Learning tools at an adult pace — no talking-down copy</li>
              <li>Optional support circle (you choose who can help)</li>
              <li>Same calm sensory & focus tools, framed for independence</li>
            </ul>
          </div>
        )}

        <form className="relative mt-6 space-y-4" onSubmit={handleSignup}>
          {error && <p className={authErrorClass}>{error}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField
              id={`signup-first-name-${role}`}
              label="First name"
              value={firstName}
              onChange={(v) => updateForm('firstName', v)}
              placeholder={placeholders.first}
              required
              autoComplete="given-name"
            />
            <AuthField
              id={`signup-last-name-${role}`}
              label="Last name"
              value={lastName}
              onChange={(v) => updateForm('lastName', v)}
              placeholder={placeholders.last}
              required
              autoComplete="family-name"
            />
          </div>

          {role === 'parent' && (
            <AuthField
              id={`signup-child-name-${role}`}
              label="Child's name"
              value={childName}
              onChange={(v) => updateForm('childName', v)}
              placeholder="e.g. Lily"
              autoComplete="off"
            />
          )}

          <div>
            <AuthSelect
              id={`signup-sex-${role}`}
              label={UK_SEX_FIELD_LABEL}
              value={sex}
              onChange={(v) => updateForm('sex', v as UserSex | '')}
              options={UK_SEX_OPTIONS}
              placeholder="Select sex"
              required
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-gray-400">{UK_SEX_FIELD_HINT}</p>
          </div>

          <div>
            <AuthSelect
              id={`signup-gender-${role}`}
              label={UK_GENDER_FIELD_LABEL}
              value={gender}
              onChange={(v) => updateForm('gender', v as UserGender | '')}
              options={UK_GENDER_OPTIONS}
              placeholder="Select gender identity"
              required
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-gray-400">{UK_GENDER_FIELD_HINT}</p>
          </div>

          {isLearnerRole(role) && (
            <div>
              <AuthField
                id={`signup-age-${role}`}
                label={isAdultLane ? 'Age (18+)' : 'Age'}
                type="number"
                value={age}
                onChange={(v) => updateForm('age', v)}
                placeholder={`${ageBounds.min}–${ageBounds.max}`}
                required
                min={ageBounds.min}
                max={ageBounds.max}
                autoComplete="off"
              />
              {suggestAdult && (
                <div className="mt-3 rounded-2xl border border-teal-200 bg-teal-50/90 p-3 dark:border-teal-500/30 dark:bg-teal-950/40">
                  <p className="text-sm font-semibold text-teal-900 dark:text-teal-100">
                    Age {parsedAge} fits Independent Buddy
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-teal-800/90 dark:text-teal-100/80">
                    Child signup is for ages {CHILD_MIN_AGE}–{CHILD_MAX_AGE}. Continue as an adult learner to keep the
                    same tools with adult-paced language and optional support.
                  </p>
                  <button
                    type="button"
                    onClick={switchToAdultLane}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-teal-500"
                  >
                    Continue as adult learner
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              )}
              {ageInvalid && !suggestAdult && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
                  Please enter an age between {ageBounds.min} and {ageBounds.max}.
                </p>
              )}
            </div>
          )}

          <AuthField
            id={`signup-email-${role}`}
            label="Email"
            type="email"
            value={email}
            onChange={(v) => updateForm('email', v)}
            placeholder="you@adaptbuddy.com"
            required
            autoComplete="email"
          />

          <div>
            <PasswordField
              id={`signup-password-${role}`}
              label="Password"
              value={password}
              onChange={(v) => updateForm('password', v)}
              placeholder="Create a strong password"
              showPassword={showPassword}
              onToggleShow={() => setShowPassword((v) => !v)}
              required
              autoComplete="new-password"
            />
            <PasswordRequirements password={password} />
          </div>

          <div>
            <PasswordField
              id={`signup-confirm-password-${role}`}
              label="Confirm password"
              value={confirmPassword}
              onChange={(v) => updateForm('confirmPassword', v)}
              placeholder="Re-enter your password"
              showPassword={showConfirmPassword}
              onToggleShow={() => setShowConfirmPassword((v) => !v)}
              required
              autoComplete="new-password"
              invalid={confirmMismatch}
            />
            {confirmTouched && (
              <p
                className={`mt-2 flex items-center gap-1.5 text-xs ${
                  passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {passwordsMatch ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </p>
            )}
          </div>

          <button type="submit" disabled={!canSubmit} className={authPrimaryBtnClass}>
            {loading ? 'Creating account…' : isAdultLane ? 'Start Independent Buddy' : 'Create account'}
            {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
          </button>
        </form>
        </div>
      </div>

      <OtpVerificationModal
        isOpen={otpModalOpen}
        email={pendingSignup?.email || email}
        loading={otpLoading}
        error={otpError}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        onClose={() => {
          setOtpModalOpen(false);
          setPendingSignup(null);
          setOtpError('');
        }}
      />
    </AuthBackground>
  );
};

export default SignupPage;
