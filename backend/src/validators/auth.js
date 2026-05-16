const { z } = require('zod');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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
