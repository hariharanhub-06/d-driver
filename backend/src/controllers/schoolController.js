const prisma = require('../prisma');
const { encrypt } = require('../utils/encryption');
const { logAudit, logAction } = require('../utils/auditLog');
const { sendWelcomeAdmin } = require('../utils/resend');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// GET /schools/public/:slug — no auth, for white-label branding
const getPublicSchool = async (req, res) => {
  try {
    const { slug } = req.params;
    const school = await prisma.school.findUnique({
      where: { slug },
      select: { name: true, logo_url: true, primary_color: true, slug: true, status: true, permissions: true },
    });
    if (!school) return res.status(404).json({ error: 'School not found' });
    res.json(school);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching school' });
  }
};

// GET /schools — SA gets all schools; non-dev SA sees only assigned schools
const getAllSchools = async (req, res) => {
  try {
    const where = req.user.is_dev_sa ? {} : { assigned_sa_id: req.user.id };
    const schools = await prisma.school.findMany({
      where,
      select: {
        id: true, name: true, slug: true, status: true, logo_url: true,
        primary_color: true, address: true, phone: true, email_contact: true, website: true,
        permissions: true, plan_id: true, created_at: true, razorpay_configured: true,
        assigned_sa_id: true,
        assignedSA: { select: { id: true, name: true, email: true } },
        _count: { select: { buses: true, students: true, drivers: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(schools);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching schools' });
  }
};

// GET /schools/:id — SA drill-in view; non-dev SA must own the school
const getSchoolById = async (req, res) => {
  try {
    const { id } = req.params;
    logAudit({
      actor_id: req.user.id, actor_role: req.user.role,
      action: 'viewed_school_data', target_type: 'school',
      target_id: id, school_id: id, ip_address: req.ip,
    });
    const school = await prisma.school.findUnique({
      where: { id },
      select: {
        id: true, name: true, slug: true, status: true, logo_url: true,
        primary_color: true, address: true, phone: true, email_contact: true, website: true,
        permissions: true, plan_id: true, subscription_plan: true, billing_due_day: true, created_at: true,
        notification_email: true, razorpay_configured: true, onboarding_dismissed: true,
        tour_completed: true, suspended_at: true, suspension_reason: true, assigned_sa_id: true,
        assignedSA: { select: { id: true, name: true, email: true } },
        _count: { select: { buses: true, students: true, drivers: true, routes: true } },
      },
    });
    if (!school) return res.status(404).json({ error: 'School not found' });
    if (!req.user.is_dev_sa && school.assigned_sa_id && school.assigned_sa_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this school' });
    }
    res.json(school);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching school' });
  }
};

// POST /schools — SA creates school + first admin auto-created
const registerSchool = async (req, res) => {
  try {
    const {
      name, slug, address, phone, email_contact, website, logo_url, primary_color,
      plan_id, admin_name, admin_email, admin_phone, admin_password,
    } = req.body;

    const existing = await prisma.school.findUnique({ where: { slug } });
    if (existing) return res.status(409).json({ error: 'Slug already in use' });

    const tempPassword = admin_password || crypto.randomBytes(8).toString('base64url');
    const hash = await bcrypt.hash(tempPassword, 12);

    const school = await prisma.school.create({
      data: {
        name, slug, address, phone, email_contact, website: website || null, logo_url, primary_color,
        plan_id: plan_id || null,
        status: 'active',
        assigned_sa_id: req.user.is_dev_sa ? null : req.user.id,
        permissions: {
          gps_tracking: true, fee_management: true, fuel_management: true,
          shift_tracking: true, attendance: true, parent_portal: true,
          route_management: true, student_photos: true,
          stop_change_requests: true, absence_reporting: true,
          razorpay_payments: false,
          gps_driver: true, fuel_requests: true, fuel_fill_entries: true,
          notifications: true, parent_notifications: true, admin_notifications: true,
          parent_multi_account: true, bus_switch: true, bulk_import: true,
          reports: true, tutorials: true,
          driver_portal: true, bus_staff_portal: true,
          password_reset: true, password_reset_admin: true, password_reset_parent: true,
          password_reset_driver: true, password_reset_bus_staff: true,
        },
        users: {
          create: {
            name: admin_name, email: admin_email, phone: admin_phone,
            password: hash, role: 'admin', is_first_login: !admin_password, is_active: true,
          },
        },
      },
      include: { users: { select: { id: true, email: true, role: true } } },
    });

    // Email is best-effort — never block school creation if Resend isn't configured
    try {
      await sendWelcomeAdmin({
        adminEmail: admin_email, adminName: admin_name,
        schoolName: name, slug, tempPassword,
      });
    } catch (emailErr) {
      console.warn('sendWelcomeAdmin failed (non-fatal):', emailErr.message);
    }

    try {
      await logAction({ req, action: 'create_school', targetType: 'school', targetId: school.id, schoolId: school.id });
    } catch (logErr) {
      console.warn('logAction failed (non-fatal):', logErr.message);
    }
    res.status(201).json({ ...school, temp_password: tempPassword });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating school' });
  }
};

// PUT /schools/:id — SA updates school details
const updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = [
      'name', 'address', 'phone', 'email_contact', 'website', 'logo_url',
      'primary_color', 'plan_id', 'subscription_plan', 'notification_email',
    ];
    const data = {};
    allowed.forEach(f => { if (req.body[f] !== undefined && req.body[f] !== null) data[f] = req.body[f]; });
    // plan_id is nullable — allow explicitly clearing it ("No plan") which the generic
    // non-null guard above would otherwise skip.
    if (req.body.plan_id !== undefined) data.plan_id = req.body.plan_id || null;
    // Billing due day (1–28) for automated monthly invoice generation; nullable.
    if (req.body.billing_due_day !== undefined) {
      const d = parseInt(req.body.billing_due_day, 10);
      data.billing_due_day = Number.isFinite(d) ? Math.min(Math.max(d, 1), 28) : null;
    }
    const school = await prisma.school.update({ where: { id }, data });
    await logAction({ req, action: 'update_school', targetType: 'school', targetId: id, schoolId: id });
    res.json(school);
  } catch (err) {
    console.error('updateSchool error:', err);
    res.status(500).json({ error: err?.message || 'Error updating school' });
  }
};

// PATCH /schools/:id/status — SA toggles active/inactive
const toggleSchoolStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const school = await prisma.school.findUnique({ where: { id }, select: { status: true } });
    if (!school) return res.status(404).json({ error: 'School not found' });

    const newStatus = school.status === 'active' ? 'inactive' : 'active';
    const updated = await prisma.school.update({
      where: { id },
      data: {
        status: newStatus,
        suspended_at: newStatus === 'inactive' ? new Date() : null,
        suspension_reason: req.body.reason || null,
      },
    });
    res.json({ status: updated.status });
  } catch (err) {
    res.status(500).json({ error: 'Error toggling school status' });
  }
};

// PUT /schools/:id/permissions — SA updates feature permissions
const updatePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    const school = await prisma.school.update({
      where: { id },
      data: { permissions },
      select: { id: true, name: true, permissions: true },
    });
    res.json(school);
  } catch (err) {
    res.status(500).json({ error: 'Error updating permissions' });
  }
};

// DELETE /schools/:id — SA only
const deleteSchool = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.$transaction([
      // ShiftKmEntry has no school_id but blocks DriverShift via FK
      prisma.shiftKmEntry.deleteMany({ where: { shift: { school_id: id } } }),
      // These all have school_id with no onDelete (default Restrict)
      prisma.activeTrip.deleteMany({ where: { school_id: id } }),
      prisma.busSwitchLog.deleteMany({ where: { school_id: id } }),
      prisma.driverShift.deleteMany({ where: { school_id: id } }),
      prisma.location.deleteMany({ where: { school_id: id } }),
      prisma.fuelFillEntry.deleteMany({ where: { school_id: id } }),
      prisma.fuelRequest.deleteMany({ where: { school_id: id } }),
      prisma.stopChangeRequest.deleteMany({ where: { school_id: id } }),
      prisma.absenceReport.deleteMany({ where: { school_id: id } }),
      prisma.notification.deleteMany({ where: { school_id: id } }),
      prisma.schoolInvoice.deleteMany({ where: { school_id: id } }),
      prisma.feeStructure.deleteMany({ where: { school_id: id } }),
      // Hard-delete the school's accounts (admins, drivers, bus-staff, parents) so they can't
      // log in afterwards. User.school_id is SetNull on school delete, which would otherwise
      // leave orphaned, still-loginable accounts behind. PasswordResetToken has a Restrict FK
      // to User, so clear those first; deleting the users cascades their Driver rows.
      prisma.passwordResetToken.deleteMany({ where: { user: { school_id: id } } }),
      prisma.user.deleteMany({ where: { school_id: id } }),
    ]);

    // School.delete cascades: Bus, Driver, Route, RouteStop, Student, Attendance, Fee, Payment
    await prisma.school.delete({ where: { id } });
    await logAction({ req, action: 'delete_school', targetType: 'school', targetId: id, schoolId: id });
    res.json({ message: 'School deleted' });
  } catch (err) {
    console.error('deleteSchool error:', err);
    res.status(500).json({ error: 'Error deleting school' });
  }
};

// PUT /schools/my/razorpay — admin sets own school's Razorpay keys
const updateSchoolRazorpay = async (req, res) => {
  try {
    const { key_id, key_secret } = req.body;
    const schoolId = req.user.school_id;
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        razorpay_key_id: encrypt(key_id),
        razorpay_key_secret: encrypt(key_secret),
        razorpay_configured: true,
      },
    });
    res.json({ message: 'Razorpay keys saved' });
  } catch (err) {
    res.status(500).json({ error: 'Error saving Razorpay keys' });
  }
};

// GET /schools/my — admin fetches own school
const getMySchool = async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.user.school_id },
      select: {
        id: true, name: true, slug: true, logo_url: true, primary_color: true,
        address: true, phone: true, email_contact: true, notification_email: true,
        status: true, permissions: true, razorpay_configured: true,
        onboarding_dismissed: true, plan_id: true,
      },
    });
    res.json(school);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching school' });
  }
};

// POST /schools/my/dismiss-onboarding — admin dismisses checklist
const dismissOnboarding = async (req, res) => {
  try {
    await prisma.school.update({
      where: { id: req.user.school_id },
      data: { onboarding_dismissed: true },
    });
    res.json({ message: 'Onboarding dismissed' });
  } catch (err) {
    res.status(500).json({ error: 'Error dismissing onboarding' });
  }
};

// PUT /schools/:id/assign-sa — Dev SA assigns a school to a specific SA
const assignSAToSchool = async (req, res) => {
  try {
    if (!req.user.is_dev_sa) return res.status(403).json({ error: 'Only Dev SA can assign schools' });
    const { id } = req.params;
    const { sa_id } = req.body;

    // Verify the target user is a super_admin
    if (sa_id) {
      const saUser = await prisma.user.findUnique({ where: { id: sa_id }, select: { role: true } });
      if (!saUser || saUser.role !== 'super_admin') {
        return res.status(400).json({ error: 'Target user must be a super_admin' });
      }
    }

    const school = await prisma.school.update({
      where: { id },
      data: { assigned_sa_id: sa_id || null },
      select: { id: true, name: true, assigned_sa_id: true, assignedSA: { select: { id: true, name: true, email: true } } },
    });
    await logAction({ req, action: 'assign_sa_to_school', targetType: 'school', targetId: id, schoolId: id });
    res.json(school);
  } catch (err) {
    res.status(500).json({ error: 'Error assigning SA to school' });
  }
};

// GET /schools/branding — any authenticated user fetches their school's branding + permissions
const getSchoolBranding = async (req, res) => {
  try {
    if (!req.user.school_id) return res.json({});
    const school = await prisma.school.findUnique({
      where: { id: req.user.school_id },
      select: { name: true, logo_url: true, primary_color: true, slug: true, permissions: true },
    });
    if (!school) return res.json({});

    let permissions = school.permissions || {};

    // Individual-plan parents: a feature is available only if the SCHOOL allows it AND at
    // least one of the parent's children is on an individual plan that grants it. Plans with
    // no permissions set (the default) don't restrict anything — fully backward compatible.
    if (req.user.role === 'parent') {
      const kids = await prisma.student.findMany({
        where: { parent_id: req.user.id, individual_plan_id: { not: null } },
        select: { individualPlan: { select: { permissions: true } } },
      });
      const planPerms = kids.map(k => k.individualPlan?.permissions).filter(p => p && typeof p === 'object');
      if (planPerms.length) {
        const eff = { ...permissions };
        const keys = new Set();
        planPerms.forEach(p => Object.keys(p).forEach(k => keys.add(k)));
        for (const k of keys) {
          const schoolAllows = permissions[k] !== false;
          const anyPlanAllows = planPerms.some(p => p[k] === true);
          eff[k] = schoolAllows && anyPlanAllows;
        }
        permissions = eff;
      }
    }

    res.json({ ...school, permissions });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching school branding' });
  }
};

const getSchoolAdmins = async (req, res) => {
  try {
    const { id } = req.params;
    const admins = await prisma.user.findMany({
      where: { school_id: id, role: 'admin' },
      select: { id: true, name: true, email: true, phone: true, is_first_login: true, created_at: true },
      orderBy: { created_at: 'asc' },
    });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching school admins' });
  }
};

module.exports = {
  getPublicSchool, getAllSchools, getSchoolById,
  registerSchool, updateSchool, deleteSchool,
  toggleSchoolStatus, updatePermissions,
  updateSchoolRazorpay, getMySchool, dismissOnboarding,
  assignSAToSchool, getSchoolBranding, getSchoolAdmins,
};
