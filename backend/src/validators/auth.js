const { z } = require('zod');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Login accepts either an email or a mobile number. Clients may send it as `identifier`
// (preferred) or the legacy `email` field; at least one must be present and non-empty.
const loginSchema = z
  .object({
    identifier: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    password: z.string().min(1),
  })
  .refine((d) => !!(d.identifier || d.email), {
    message: 'Email or mobile number is required',
    path: ['identifier'],
  });

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: password,
});

const forgotPasswordSchema = z.object({
  value: z.string().min(1),           // email OR phone
  method: z.enum(['email', 'mobile']),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  new_password: password,
});

module.exports = { loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema };
