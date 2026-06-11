const prisma = require('../prisma');

const SINGLETON_ID = 'singleton';

// ─── PUBLIC: landing page data ────────────────────────────────────────────────
// GET /platform/landing
const getLandingData = async (req, res) => {
  try {
    const [config, partners, founders, schools, stats] = await Promise.all([
      prisma.platformConfig.findUnique({ where: { id: SINGLETON_ID } }),
      prisma.landingPartner.findMany({ where: { is_active: true }, orderBy: { sort_order: 'asc' } }),
      prisma.landingFounder.findMany({ where: { is_active: true }, orderBy: { sort_order: 'asc' } }),
      prisma.school.findMany({
        where: { status: 'active' },
        select: { id: true, name: true, logo_url: true },
        orderBy: { created_at: 'asc' },
      }),
      Promise.allSettled([
        prisma.school.count(),
        prisma.user.count({ where: { role: 'parent', is_active: true } }),
        prisma.activeTrip.count({ where: { status: 'running' } }),
        prisma.user.count({ where: { role: 'driver', is_active: true } }),
        prisma.user.count({ where: { role: { in: ['admin', 'bus_staff'] }, is_active: true } }),
      ]),
    ]);

    const [schoolCount, parentCount, busesLive, driverCount, staffCount] = stats.map(r =>
      r.status === 'fulfilled' ? r.value : 0
    );

    res.json({
      config: config || {
        product_name: 'ONLIVE',
        platform_logo_url: null,
        landing_badge: 'School Transport OS',
        landing_title: 'Every Mile, Every Child, Safe.',
        landing_subtitle: 'Complete school bus management — live GPS tracking for parents, digital attendance for drivers, and full ERP control for admins.',
        landing_cta_text: 'Get Started Free',
        landing_footer_tagline: 'The complete school bus ERP — built for safety, transparency, and operational efficiency.',
        landing_footer_email: 'support@onlive.app',
        landing_footer_phone: null,
        landing_footer_address: null,
        landing_footer_copyright: 'ONLIVE. All rights reserved.',
      },
      stats: {
        schools: schoolCount,
        parents: parentCount,
        buses_live: busesLive,
        drivers: driverCount,
        staff_admins: staffCount,
      },
      partners,
      founders,
      schools,
    });
  } catch (err) {
    console.error('getLandingData error:', err);
    res.status(500).json({ error: 'Error fetching landing data' });
  }
};

// ─── PUBLIC: platform logo only (login page) ─────────────────────────────────
// GET /platform/config
const getConfig = async (req, res) => {
  try {
    const config = await prisma.platformConfig.findUnique({ where: { id: SINGLETON_ID } });
    res.json(config || { platform_logo_url: null, product_name: 'ONLIVE' });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching platform config' });
  }
};

// ─── DEV SA: update config + landing content ─────────────────────────────────
// PUT /platform/config
const updateConfig = async (req, res) => {
  try {
    const {
      platform_logo_url,
      product_name,
      landing_badge,
      landing_title,
      landing_subtitle,
      landing_cta_text,
      landing_footer_tagline,
      landing_footer_email,
      landing_footer_phone,
      landing_footer_address,
      landing_footer_copyright,
    } = req.body;

    const data = {};
    if (platform_logo_url !== undefined) data.platform_logo_url = platform_logo_url || null;
    if (product_name)            data.product_name = product_name;
    if (landing_badge)           data.landing_badge = landing_badge;
    if (landing_title)           data.landing_title = landing_title;
    if (landing_subtitle)        data.landing_subtitle = landing_subtitle;
    if (landing_cta_text)        data.landing_cta_text = landing_cta_text;
    if (landing_footer_tagline)  data.landing_footer_tagline = landing_footer_tagline;
    if (landing_footer_email)    data.landing_footer_email = landing_footer_email;
    if (landing_footer_phone !== undefined) data.landing_footer_phone = landing_footer_phone || null;
    if (landing_footer_address !== undefined) data.landing_footer_address = landing_footer_address || null;
    if (landing_footer_copyright) data.landing_footer_copyright = landing_footer_copyright;

    const config = await prisma.platformConfig.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    });
    res.json(config);
  } catch (err) {
    console.error('updateConfig error:', err);
    res.status(500).json({ error: 'Error updating platform config' });
  }
};

// ─── DEV SA: Partners CRUD ────────────────────────────────────────────────────
const createPartner = async (req, res) => {
  try {
    const { name, logo_url, website, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const partner = await prisma.landingPartner.create({
      data: { name, logo_url: logo_url || null, website: website || null, sort_order: sort_order || 0 },
    });
    res.status(201).json(partner);
  } catch (err) {
    res.status(500).json({ error: 'Error creating partner' });
  }
};

const updatePartner = async (req, res) => {
  try {
    const { name, logo_url, website, sort_order, is_active } = req.body;
    const partner = await prisma.landingPartner.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(logo_url !== undefined && { logo_url: logo_url || null }),
        ...(website !== undefined && { website: website || null }),
        ...(sort_order !== undefined && { sort_order }),
        ...(is_active !== undefined && { is_active }),
      },
    });
    res.json(partner);
  } catch (err) {
    res.status(500).json({ error: 'Error updating partner' });
  }
};

const deletePartner = async (req, res) => {
  try {
    await prisma.landingPartner.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting partner' });
  }
};

const listPartners = async (req, res) => {
  try {
    const partners = await prisma.landingPartner.findMany({ orderBy: { sort_order: 'asc' } });
    res.json(partners);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching partners' });
  }
};

// ─── DEV SA: Founders CRUD ────────────────────────────────────────────────────
const createFounder = async (req, res) => {
  try {
    const { name, title, photo_url, linkedin, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const founder = await prisma.landingFounder.create({
      data: { name, title: title || null, photo_url: photo_url || null, linkedin: linkedin || null, sort_order: sort_order || 0 },
    });
    res.status(201).json(founder);
  } catch (err) {
    res.status(500).json({ error: 'Error creating founder' });
  }
};

const updateFounder = async (req, res) => {
  try {
    const { name, title, photo_url, linkedin, sort_order, is_active } = req.body;
    const founder = await prisma.landingFounder.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(title !== undefined && { title: title || null }),
        ...(photo_url !== undefined && { photo_url: photo_url || null }),
        ...(linkedin !== undefined && { linkedin: linkedin || null }),
        ...(sort_order !== undefined && { sort_order }),
        ...(is_active !== undefined && { is_active }),
      },
    });
    res.json(founder);
  } catch (err) {
    res.status(500).json({ error: 'Error updating founder' });
  }
};

const deleteFounder = async (req, res) => {
  try {
    await prisma.landingFounder.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting founder' });
  }
};

const listFounders = async (req, res) => {
  try {
    const founders = await prisma.landingFounder.findMany({ orderBy: { sort_order: 'asc' } });
    res.json(founders);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching founders' });
  }
};

module.exports = {
  getLandingData, getConfig, updateConfig,
  createPartner, updatePartner, deletePartner, listPartners,
  createFounder, updateFounder, deleteFounder, listFounders,
};
