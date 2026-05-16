const prisma = require('../prisma');

// GET /dashboard/stats — admin gets their school's live stats
const getStats = async (req, res) => {
  try {
    const schoolId = req.user.role === 'super_admin'
      ? (req.query.school_id || null)
      : req.user.school_id;

    const where = schoolId ? { school_id: schoolId } : {};

    const [students, buses, drivers, routes, activeTrips, todayAbsences, pendingFees] = await Promise.all([
      prisma.student.count({ where }),
      prisma.bus.count({ where }),
      prisma.driver.count({ where }),
      prisma.route.count({ where: { ...where, is_active: true } }),
      prisma.activeTrip.count({ where: { ...where, status: 'running' } }),
      prisma.absenceReport.count({
        where: {
          ...where,
          date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.fee.aggregate({
        where: { ...where, due_amount: { gt: 0 } },
        _sum: { due_amount: true },
      }),
    ]);

    res.json({
      students,
      buses,
      drivers,
      routes,
      active_trips: activeTrips,
      today_absences: todayAbsences,
      pending_fees: pendingFees._sum.due_amount || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching stats' });
  }
};

module.exports = { getStats };
