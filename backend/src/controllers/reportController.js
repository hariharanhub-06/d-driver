const { generateAttendanceExcel, generateFeeExcel, generateKmExcel } = require('../utils/exportReports');

const getAttendanceReport = async (req, res) => {
  try {
    const school_id = req.user.role === 'super_admin'
      ? (req.query.school_id || req.schoolId)
      : req.user.school_id;

    if (!school_id) return res.status(400).json({ error: 'school_id is required' });

    const from = req.query.from ? new Date(req.query.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    const route_id = req.query.route_id || null;

    const buffer = await generateAttendanceExcel({ school_id, from, to, route_id });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.xlsx"');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generating attendance report' });
  }
};

const getFeeReport = async (req, res) => {
  try {
    const school_id = req.user.role === 'super_admin'
      ? (req.query.school_id || req.schoolId)
      : req.user.school_id;

    if (!school_id) return res.status(400).json({ error: 'school_id is required' });

    const month = req.query.month || null;
    const status = req.query.status || null;

    const buffer = await generateFeeExcel({ school_id, month, status });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="fee-report.xlsx"');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generating fee report' });
  }
};

const getKmReport = async (req, res) => {
  try {
    const school_id = req.user.role === 'super_admin'
      ? (req.query.school_id || req.schoolId)
      : req.user.school_id;

    if (!school_id) return res.status(400).json({ error: 'school_id is required' });

    const from = req.query.from ? new Date(req.query.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = req.query.to ? new Date(req.query.to) : new Date();

    const buffer = await generateKmExcel({ school_id, from, to });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="km-log-report.xlsx"');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generating KM log report' });
  }
};

module.exports = { getAttendanceReport, getFeeReport, getKmReport };
