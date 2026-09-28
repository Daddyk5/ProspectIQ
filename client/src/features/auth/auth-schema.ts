import { z } from 'zod';

export const SignInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your work email address')
    .max(254, 'Email address is too long')
    .pipe(z.email('Enter a valid email address, like name@company.com')),
  password: z.string().min(1, 'Enter your password').min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
  remember: z.boolean(),
});

export type SignInValues = z.infer<typeof SignInSchema>;
export type SignInField = 'email' | 'password';
export type FieldErrors = Partial<Record<SignInField, string>>;

/** Returns the first error message per field, or an empty object when valid. */
export function validateSignIn(values: SignInValues): { data?: SignInValues; errors: FieldErrors } {
  const r = SignInSchema.safeParse(values);
  if (r.success) return { data: r.data, errors: {} };
  const errors: FieldErrors = {};
  for (const issue of r.error.issues) {
    const field = issue.path[0] as SignInField;
    if (!errors[field]) errors[field] = issue.message;
  }
  return { errors };
}
