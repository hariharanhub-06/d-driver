const { z } = require('zod');

const createSchoolSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  address: z.string().optional(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  phone: z.string().optional(),
  email_contact: z.string().email().optional(),
  website: z.union([z.string(), z.literal('')]).optional(),
  logo_url: z.string().optional(),
  plan_id: z.string().uuid().optional(),
  // First admin (required at creation)
  admin_name: z.string().min(2),
  admin_email: z.string().email(),
  admin_phone: z.string().optional(),
  admin_password: z.string().optional(),
});

const updateSchoolSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  phone: z.string().optional(),
  email_contact: z.union([z.string().email(), z.literal('')]).optional(),
  notification_email: z.union([z.string().email(), z.literal('')]).optional(),
  website: z.union([z.string(), z.literal('')]).optional(),
  logo_url: z.string().optional(),
  subscription_plan: z.string().optional(),
});

const updatePermissionsSchema = z.object({
  permissions: z.record(z.boolean()),
});

const updateRazorpaySchema = z.object({
  key_id: z.string().min(1),
  key_secret: z.string().min(1),
});

module.exports = { createSchoolSchema, updateSchoolSchema, updatePermissionsSchema, updateRazorpaySchema };
