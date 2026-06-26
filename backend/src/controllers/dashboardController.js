const prisma = require('../prisma');
const { getSchoolFilter } = require('../middleware/authMiddleware');

// GET /dashboard/stats — admin gets their school's live stats
const getStats = async (req, res) => {
  try {
    const where = getSchoolFilter(req);

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

// GET /dashboard/financials?period=current|past|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
const getFinancials = async (req, res) => {
  try {
    const { period = 'current', from, to } = req.query;
    const schoolFilter = getSchoolFilter(req);

    let startDate, endDate;
    const now = new Date();

    if (period === 'custom' && from && to) {
      startDate = new Date(from);
      endDate = new Date(new Date(to).getTime() + 86399999);
    } else if (period === 'past') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else {
      // current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const dateFilter = { gte: startDate, lte: endDate };

    const [payments, fuelRequests, maintenanceRecords] = await Promise.all([
      // Income: paid payments in period
      prisma.payment.findMany({
        where: { ...schoolFilter, payment_date: dateFilter },
        select: { amount: true, payment_date: true },
      }),
      // Expenses: disbursed fuel requests in period (amount_requested is in ₹)
      prisma.fuelRequest.findMany({
        where: { ...schoolFilter, status: 'disbursed', updated_at: dateFilter },
        select: { amount_requested: true, updated_at: true },
      }),
      // Expenses: approved maintenance in period
      prisma.maintenanceRecord.findMany({
        where: { ...schoolFilter, status: 'approved', date: dateFilter },
        select: { total_cost: true, date: true },
      }),
    ]);

    const totalIncome = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalFuelCost = fuelRequests.reduce((sum, f) => sum + (f.amount_requested || 0), 0);
    const totalMaintenanceCost = maintenanceRecords.reduce((sum, m) => sum + (m.total_cost || 0), 0);
    const totalExpenses = totalFuelCost + totalMaintenanceCost;

    // Daily breakdown for chart (sum by date)
    const incomeByDay = {};
    for (const p of payments) {
      const day = new Date(p.payment_date).toLocaleDateString('en-CA');
      incomeByDay[day] = (incomeByDay[day] || 0) + (p.amount || 0);
    }
    const expenseByDay = {};
    for (const f of fuelRequests) {
      const day = new Date(f.updated_at).toLocaleDateString('en-CA');
      expenseByDay[day] = (expenseByDay[day] || 0) + (f.amount_requested || 0);
    }
    for (const m of maintenanceRecords) {
      const day = new Date(m.date).toLocaleDateString('en-CA');
      expenseByDay[day] = (expenseByDay[day] || 0) + (m.total_cost || 0);
    }

    // Merge days
    const allDays = [...new Set([...Object.keys(incomeByDay), ...Object.keys(expenseByDay)])].sort();
    const chartData = allDays.map(day => ({
      date: day,
      income: incomeByDay[day] || 0,
      expense: expenseByDay[day] || 0,
    }));

    res.json({
      summary: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net: totalIncome - totalExpenses,
        period,
        from: startDate,
        to: endDate,
      },
      chart: chartData,
    });
  } catch (err) {
    console.error('getFinancials error:', err);
    res.status(500).json({ error: 'Error fetching financials' });
  }
};

// GET /dashboard/pending-counts — counts of incoming items awaiting admin action.
// Keyed by sidebar href so the frontend can map badges directly.
const getPendingCounts = async (req, res) => {
  try {
    const where = getSchoolFilter(req);
    const [stopChange, fuel, maintenance, feeDelay] = await Promise.all([
      prisma.stopChangeRequest.count({ where: { ...where, status: 'pending' } }),
      prisma.fuelRequest.count({ where: { ...where, status: 'pending' } }),
      prisma.maintenanceRecord.count({ where: { ...where, status: 'pending' } }),
      prisma.feeDelayRequest.count({ where: { ...where, status: 'pending' } }),
    ]);

    res.json({
      '/admin/stop-change-requests': stopChange,
      '/admin/fuel-requests': fuel,
      '/admin/maintenance': maintenance,
      '/admin/fees': feeDelay,
    });
  } catch (err) {
    console.error('getPendingCounts error:', err);
    res.status(500).json({ error: 'Error fetching pending counts' });
  }
};

module.exports = { getStats, getFinancials, getPendingCounts };
