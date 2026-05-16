const XLSX = require('xlsx');
const prisma = require('../prisma');

async function generateAttendanceExcel(filters) {
  const { school_id, from, to, route_id } = filters;

  const where = {
    school_id,
    date: { gte: from, lte: to },
  };

  const records = await prisma.attendance.findMany({
    where,
    include: {
      student: {
        select: {
          name: true,
          grade: true,
          route: { select: { name: true } },
          stop: { select: { name: true } },
        },
      },
    },
    orderBy: { date: 'asc' },
  });

  const filtered = route_id
    ? records.filter(r => r.student?.route?.name && r.student.route_id === route_id)
    : records;

  const rows = filtered.map(r => ({
    Date: r.date ? new Date(r.date).toLocaleDateString() : '',
    Student: r.student?.name || '',
    Grade: r.student?.grade || '',
    Route: r.student?.route?.name || '',
    Stop: r.student?.stop?.name || '',
    Status: r.status || '',
    Note: r.note || '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

async function generateFeeExcel(filters) {
  const { school_id, month, status } = filters;

  const where = { school_id };
  if (status) {
    where.payments = { some: { status } };
  }

  const fees = await prisma.fee.findMany({
    where,
    include: {
      student: { select: { name: true, grade: true } },
      payments: { orderBy: { payment_date: 'desc' }, take: 1 },
    },
    orderBy: { due_date: 'asc' },
  });

  const filtered = month
    ? fees.filter(f => {
        const d = new Date(f.due_date);
        const feeMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return feeMonth === month;
      })
    : fees;

  const rows = filtered.map(f => {
    const lastPayment = f.payments[0];
    return {
      Student: f.student?.name || '',
      Grade: f.student?.grade || '',
      Amount: f.total_amount,
      DueDate: f.due_date ? new Date(f.due_date).toLocaleDateString() : '',
      Status: lastPayment ? lastPayment.status : 'pending',
      PaymentMethod: lastPayment?.payment_method || '',
      PaidAt: lastPayment?.payment_date ? new Date(lastPayment.payment_date).toLocaleDateString() : '',
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Fees');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

async function generateKmExcel(filters) {
  const { school_id, from, to } = filters;

  const shifts = await prisma.driverShift.findMany({
    where: {
      school_id,
      date: { gte: from, lte: to },
    },
    include: {
      driver: {
        include: { user: { select: { name: true } } },
      },
      kmEntries: {
        include: { bus: { select: { bus_number: true } } },
        orderBy: { recorded_at: 'asc' },
      },
      activeTrips: { where: { status: 'completed' }, select: { id: true } },
    },
    orderBy: { date: 'asc' },
  });

  const rows = shifts.map(shift => {
    const readings = shift.kmEntries.map(e => e.km_reading);
    const startKm = readings.length > 0 ? Math.min(...readings) : 0;
    const endKm = readings.length > 0 ? Math.max(...readings) : 0;
    const totalKm = endKm - startKm;
    const busNumbers = [...new Set(shift.kmEntries.map(e => e.bus?.bus_number).filter(Boolean))];

    return {
      Date: shift.date ? new Date(shift.date).toLocaleDateString() : '',
      Driver: shift.driver?.user?.name || '',
      Bus: busNumbers.join(', '),
      StartKm: startKm,
      EndKm: endKm,
      TotalKm: totalKm > 0 ? totalKm : 0,
      Trips: shift.activeTrips.length,
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'KM Log');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { generateAttendanceExcel, generateFeeExcel, generateKmExcel };
