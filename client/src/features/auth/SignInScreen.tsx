import { CircleAlert, Eye, EyeOff, LoaderCircle, Lock, TriangleAlert } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { validateSignIn, type FieldErrors, type SignInField, type SignInValues } from './auth-schema';
import { AuthError, signInWithPassword, signInWithProvider, type Session } from './auth-service';
import { GoogleIcon, MicrosoftIcon } from './BrandIcons';
import { MarketingLoop } from './MarketingLoop';

type Pending = null | 'password' | 'google' | 'microsoft';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

interface Props {
  onSignedIn: (session: Session) => void;
  /** Injectable for tests and for wiring a real identity provider. */
  auth?: { password: typeof signInWithPassword; provider: typeof signInWithProvider };
  marketingVideoSrc?: string;
}

export function SignInScreen({ onSignedIn, auth = { password: signInWithPassword, provider: signInWithProvider }, marketingVideoSrc }: Props) {
  const [values, setValues] = useState<SignInValues>({ email: '', password: '', remember: true });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<SignInField, boolean>>>({});
  const [pending, setPending] = useState<Pending>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [failures, setFailures] = useState(0);
  const [lockedFor, setLockedFor] = useState(0);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const ids = { email: `${id}-email`, password: `${id}-password`, emailErr: `${id}-email-err`, pwErr: `${id}-pw-err`, pwHint: `${id}-pw-hint`, alert: `${id}-alert` };

  useEffect(() => emailRef.current?.focus(), []);

  // Client-side throttle after repeated failures (the server must enforce its own).
  useEffect(() => {
    if (lockedFor <= 0) return;
    const t = setTimeout(() => setLockedFor((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockedFor]);

  const busy = pending !== null;
  const locked = lockedFor > 0;

  function update<K extends keyof SignInValues>(key: K, value: SignInValues[K]) {
    const next = { ...values, [key]: value };
    setValues(next);
    setFormError(null);
    // Re-validate touched fields as the user types so errors clear immediately.
    if (key !== 'remember' && touched[key as SignInField]) setErrors(validateSignIn(next).errors);
  }

  function blur(field: SignInField) {
    setTouched((t) => ({ ...t, [field]: true }));
    const fieldError = validateSignIn(values).errors[field];
    setErrors((e) => ({ ...e, [field]: values[field] ? fieldError : e[field] }));
  }

  function fail(err: unknown) {
    const message = err instanceof AuthError ? err.message : 'We could not reach the sign-in service. Check your connection and try again.';
    setFormError(message);
    if (err instanceof AuthError && err.code === 'INVALID_CREDENTIALS') {
      const n = failures + 1;
      setFailures(n);
      if (n >= MAX_ATTEMPTS) {
        setLockedFor(LOCKOUT_SECONDS);
        setFailures(0);
      }
    }
    requestAnimationFrame(() => alertRef.current?.focus());
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || locked) return;
    setTouched({ email: true, password: true });
    const { data, errors: found } = validateSignIn(values);
    setErrors(found);
    if (!data) {
      (found.email ? emailRef : passwordRef).current?.focus();
      return;
    }
    setPending('password');
    setFormError(null);
    try {
      const session = await auth.password(data);
      onSignedIn(session);
    } catch (err) {
      fail(err);
      setPending(null);
    }
  }

  async function onProvider(provider: 'google' | 'microsoft') {
    if (busy) return;
    setPending(provider);
    setFormError(null);
    try {
      onSignedIn(await auth.provider(provider));
    } catch (err) {
      fail(err);
      setPending(null);
    }
  }

  const status = pending === 'password' ? 'Signing you in…' : pending ? `Connecting to ${pending === 'google' ? 'Google' : 'Microsoft'}…` : '';

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <MarketingLoop videoSrc={marketingVideoSrc} />

      <section className="flex items-center justify-center px-4 py-10 sm:px-10" aria-labelledby={`${id}-title`}>
        <div className="w-full max-w-sm">
          <h1 id={`${id}-title`} className="text-2xl font-semibold tracking-tight text-white">
            Sign in to ProspectIQ
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">Use your work account or company single sign-on.</p>

          <div className="mt-8 grid gap-2.5">
            <button type="button" className="btn h-10 w-full bg-white/[0.03]" onClick={() => onProvider('google')} disabled={busy} aria-busy={pending === 'google'}>
              {pending === 'google' ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <GoogleIcon />}
              Continue with Google
            </button>
            <button type="button" className="btn h-10 w-full bg-white/[0.03]" onClick={() => onProvider('microsoft')} disabled={busy} aria-busy={pending === 'microsoft'}>
              {pending === 'microsoft' ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <MicrosoftIcon />}
              Continue with Microsoft SSO
            </button>
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-slate-500" role="separator">
            <span className="h-px flex-1 bg-slate-800" /> or with email <span className="h-px flex-1 bg-slate-800" />
          </div>

          {(formError || locked) && (
            <div
              ref={alertRef}
              id={ids.alert}
              role="alert"
              tabIndex={-1}
              className="mb-4 flex gap-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200 outline-none"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{locked ? `Too many failed attempts. Try again in ${lockedFor}s.` : formError}</span>
            </div>
          )}

          <form noValidate onSubmit={onSubmit} aria-describedby={formError ? ids.alert : undefined} className="space-y-4">
            <div>
              <label htmlFor={ids.email} className="mb-1.5 block text-sm font-medium text-slate-200">
                Work email
              </label>
              <input
                ref={emailRef}
                id={ids.email}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                spellCheck={false}
                required
                className="field"
                placeholder="name@company.com"
                value={values.email}
                onChange={(e) => update('email', e.target.value)}
                onBlur={() => blur('email')}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? ids.emailErr : undefined}
                disabled={busy}
              />
              {errors.email && (
                <p id={ids.emailErr} className="mt-1.5 flex items-center gap-1 text-xs text-rose-300">
                  <CircleAlert className="size-3.5" aria-hidden="true" /> {errors.email}
                </p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor={ids.password} className="text-sm font-medium text-slate-200">
                  Password
                </label>
                <a href="#forgot-password" className="text-xs text-indigo-300 hover:text-indigo-200 focus-visible:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  ref={passwordRef}
                  id={ids.password}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="field pr-11"
                  value={values.password}
                  onChange={(e) => update('password', e.target.value)}
                  onBlur={() => blur('password')}
                  onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={[errors.password ? ids.pwErr : '', capsLock ? ids.pwHint : ''].filter(Boolean).join(' ') || undefined}
                  disabled={busy}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 grid w-10 cursor-pointer place-items-center text-slate-400 hover:text-slate-200"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  aria-controls={ids.password}
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
              {errors.password && (
                <p id={ids.pwErr} className="mt-1.5 flex items-center gap-1 text-xs text-rose-300">
                  <CircleAlert className="size-3.5" aria-hidden="true" /> {errors.password}
                </p>
              )}
              {capsLock && (
                <p id={ids.pwHint} className="mt-1.5 flex items-center gap-1 text-xs text-amber-300">
                  <TriangleAlert className="size-3.5" aria-hidden="true" /> Caps Lock is on
                </p>
              )}
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                className="size-4 rounded accent-indigo-500"
                checked={values.remember}
                onChange={(e) => update('remember', e.target.checked)}
                disabled={busy}
              />
              Keep me signed in on this device
            </label>

            <button type="submit" className="btn btn-primary h-10 w-full" disabled={busy || locked} aria-busy={pending === 'password'}>
              {pending === 'password' ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
              {pending === 'password' ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="sr-only" role="status" aria-live="polite">
            {status}
          </p>

          <p className="mt-8 text-center text-xs leading-relaxed text-slate-500">
            By signing in you agree to the ProspectIQ Terms of Service and Privacy Policy. Access is logged for audit.
          </p>
        </div>
      </section>
    </main>
  );
}
