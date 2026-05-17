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
      select: { name: true, logo_url: true, primary_color: true, slug: true, status: true },
    });
    if (!school) return res.status(404).json({ error: 'School not found' });
    res.json(school);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching school' });
  }
};

// GET /schools — SA gets all schools
const getAllSchools = async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      select: {
        id: true, name: true, slug: true, status: true, logo_url: true,
        primary_color: true, address: true, phone: true, email_contact: true,
        permissions: true, plan_id: true, created_at: true, razorpay_configured: true,
        _count: { select: { buses: true, students: true, drivers: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(schools);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching schools' });
  }
};

// GET /schools/:id — SA drill-in view
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
        primary_color: true, address: true, phone: true, email_contact: true,
        permissions: true, plan_id: true, created_at: true, notification_email: true,
        razorpay_configured: true, onboarding_dismissed: true, tour_completed: true,
        suspended_at: true, suspension_reason: true,
        _count: { select: { buses: true, students: true, drivers: true, routes: true } },
      },
    });
    if (!school) return res.status(404).json({ error: 'School not found' });
    res.json(school);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching school' });
  }
};

// POST /schools — SA creates school + first admin auto-created
const registerSchool = async (req, res) => {
  try {
    const {
      name, slug, address, phone, email_contact, logo_url, primary_color,
      plan_id, admin_name, admin_email, admin_phone,
    } = req.body;

    const existing = await prisma.school.findUnique({ where: { slug } });
    if (existing) return res.status(409).json({ error: 'Slug already in use' });

    const tempPassword = crypto.randomBytes(8).toString('base64url');
    const hash = await bcrypt.hash(tempPassword, 12);

    const school = await prisma.school.create({
      data: {
        name, slug, address, phone, email_contact, logo_url, primary_color,
        plan_id: plan_id || null,
        status: 'active',
        permissions: {
          gps_tracking: true, fee_management: true, fuel_management: true,
          shift_tracking: true, attendance: true, parent_portal: true,
          route_management: true, student_photos: true,
          stop_change_requests: true, absence_reporting: true,
          razorpay_payments: false,
        },
        users: {
          create: {
            name: admin_name, email: admin_email, phone: admin_phone,
            password: hash, role: 'admin', is_first_login: true, is_active: true,
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

    await logAction({ req, action: 'create_school', targetType: 'school', targetId: school.id, schoolId: school.id });
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
      'name', 'address', 'phone', 'email_contact', 'logo_url',
      'primary_color', 'plan_id', 'notification_email',
    ];
    const data = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    const school = await prisma.school.update({ where: { id }, data });
    await logAction({ req, action: 'update_school', targetType: 'school', targetId: id, schoolId: id });
    res.json(school);
  } catch (err) {
    res.status(500).json({ error: 'Error updating school' });
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
    await prisma.school.delete({ where: { id } });
    await logAction({ req, action: 'delete_school', targetType: 'school', targetId: id, schoolId: id });
    res.json({ message: 'School deleted' });
  } catch (err) {
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

module.exports = {
  getPublicSchool, getAllSchools, getSchoolById,
  registerSchool, updateSchool, deleteSchool,
  toggleSchoolStatus, updatePermissions,
  updateSchoolRazorpay, getMySchool, dismissOnboarding,
};
