const prisma = require('../prisma');

// GET /parents — admin lists all parents in their school
const getAllParents = async (req, res) => {
  try {
    const { getSchoolFilter } = require('../middleware/authMiddleware');
    const parents = await prisma.user.findMany({
      where: { ...getSchoolFilter(req), role: 'parent' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        is_active: true,
        is_first_login: true,
        children: {
          select: {
            id: true,
            name: true,
            grade: true,
            route: { select: { name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(parents);
  } catch (err) {
    console.error('getAllParents error:', err);
    res.status(500).json({ error: 'Error fetching parents' });
  }
};

// GET /parents/:id
const getParentById = async (req, res) => {
  try {
    const parent = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        is_active: true,
        role: true,
        children: {
          include: {
            route: true,
            stop: true,
          },
        },
      },
    });

    if (!parent) return res.status(404).json({ error: 'Parent not found' });
    if (parent.role !== 'parent') return res.status(404).json({ error: 'Parent not found' });

    // Tenancy: a school admin may only view a parent who has a child in their school
    // (a linked parent's home school_id can differ from where their child is enrolled).
    if (req.user.role !== 'super_admin') {
      const inSchool = await prisma.student.findFirst({
        where: { parent_id: parent.id, school_id: req.user.school_id },
        select: { id: true },
      });
      if (!inSchool) return res.status(404).json({ error: 'Parent not found' });
    }

    res.json(parent);
  } catch (err) {
    console.error('getParentById error:', err);
    res.status(500).json({ error: 'Error fetching parent' });
  }
};

module.exports = { getAllParents, getParentById };
