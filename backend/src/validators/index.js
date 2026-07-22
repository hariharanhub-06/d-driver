const { z } = require('zod');

// Middleware factory — validates req.body against a Zod schema
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }
  req.body = result.data; // use parsed + coerced data
  next();
};

// Common reusable field schemas
const uuidParam = z.string().uuid();
const phoneNumber = z.string().regex(/^\+?[0-9]{7,15}$/).optional();

const busSchema = z.object({
  bus_number: z.string().min(1),
  capacity: z.number().int().positive().optional(),
  registration_no: z.string().optional(),
  mileage: z.number().positive().optional(),
  initial_fuel_liters: z.number().nonnegative().optional(),
  school_id: z.string().optional(),
});

const driverSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: phoneNumber,
  license_no: z.string().optional(),
  assigned_bus_id: z.string().uuid().optional(),
});

const routeSchema = z.object({
  name: z.string().min(2),
  start_point: z.string().optional(),
  end_point: z.string().optional(),
  bus_id: z.string().uuid().optional(),
  route_type: z.enum(['morning', 'afternoon', 'both']).default('morning'),
});

const stopSchema = z.object({
  name: z.string().min(2),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  route_id: z.string().uuid(),
  sequence: z.number().int().nonnegative().default(0),
  pickup_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  drop_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

const studentSchema = z.object({
  name: z.string().min(2),
  grade: z.string().optional(),
  section: z.string().optional(),
  gr_no: z.string().optional(),
  route_id: z.string().uuid().optional(),
  stop_id: z.string().uuid().optional(),
  // parent_id links the student to an EXISTING parent account; parent_password sets the
  // temp password when creating a NEW parent. Both must be declared here or the validate()
  // middleware strips them from req.body (Zod drops unknown keys), which silently breaks
  // existing-parent linking and forces an auto-generated password on create.
  parent_id: z.string().uuid().optional(),
  parent_email: z.string().email().optional(),
  parent_phone: phoneNumber,
  parent_name: z.string().optional(),
  parent_password: z.string().min(1).optional(),
  school_id: z.string().optional(),
  // Fee structure
  fee_amount: z.number().positive().optional(),
  fee_frequency: z.enum(['monthly', 'weekly', 'quarterly', 'half-yearly', 'yearly']).optional(),
  fee_due_day: z.number().int().min(1).max(31).optional(),
  academic_year: z.string().optional(),
});

const fuelFillSchema = z.object({
  bus_id: z.string().uuid().optional(),
  liters_filled: z.number().positive(),
  km_at_fill: z.number().nonnegative().optional(),
});

const fuelRequestSchema = z.object({
  bus_id: z.string().uuid(),
  amount_requested: z.number().positive(),
  current_km: z.number().nonnegative(),
  reason: z.string().optional(),
});

const shiftStartSchema = z.object({
  bus_id: z.string().uuid(),
  start_km: z.number().nonnegative(),
});

const kmEntrySchema = z.object({
  bus_id: z.string().uuid(),
  km_reading: z.number().nonnegative(),
  entry_type: z.enum(['shift_start', 'route_start', 'route_end', 'bus_switch', 'shift_end']),
  note: z.string().optional(),
});

const busSwitchSchema = z.object({
  original_bus_id: z.string().uuid().optional(),
  reason: z.enum(['breakdown', 'accident', 'maintenance', 'other']),
  notes: z.string().optional(),
  km_at_switch: z.number().nonnegative().optional(),
});

const absenceReportSchema = z.object({
  student_id: z.string().uuid(),
  date: z.string().min(1),
  reason: z.string().optional(),
});

const stopChangeSchema = z.object({
  student_id: z.string().uuid(),
  current_stop_id: z.string().uuid().optional(),
  requested_stop_id: z.string().uuid(),
  change_type: z.enum(['temporary', 'permanent']),
  effective_date: z.string().min(1),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  reason: z.string().optional(),
});

const pricingPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  is_template: z.boolean().default(true),
  line_items: z.array(z.object({
    label: z.string().min(1),
    description: z.string().optional(),
    // Must stay in sync with the switch in invoiceGenerator/computeInvoiceForSchool and the
    // options offered by the super-admin plan editor. 'expense'/'profit' are internal planning
    // rows (never billed); 'flat_fee' is a synonym of 'fixed'.
    metric: z.enum([
      'fixed', 'flat_fee', 'per_bus', 'per_student', 'per_driver', 'per_route',
      'per_gps_hour', 'per_km', 'per_shift', 'custom', 'expense', 'profit',
    ]),
    unit_rate: z.number().nonnegative(),
    is_mandatory: z.boolean().default(true),
    min_value: z.number().nonnegative().optional(),
  })).min(1),
});

module.exports = {
  validate,
  busSchema,
  driverSchema,
  routeSchema,
  stopSchema,
  studentSchema,
  fuelFillSchema,
  fuelRequestSchema,
  shiftStartSchema,
  kmEntrySchema,
  busSwitchSchema,
  absenceReportSchema,
  stopChangeSchema,
  pricingPlanSchema,
};
