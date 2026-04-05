const prisma = require('../prisma');

const getAttendance = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const { date } = req.query;
        const attendance = await prisma.attendance.findMany({
            where: {
                school_id: schoolId,
                date: date ? new Date(date) : undefined
            },
            include: { student: true }
        });
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance', error: error.message });
    }
};

const markAttendance = async (req, res) => {
    try {
        const { student_id, date, status, school_id } = req.body;
        const record = await prisma.attendance.create({
            data: { student_id, date: new Date(date), status, school_id }
        });
        res.status(201).json(record);
    } catch (error) {
        res.status(500).json({ message: 'Error marking attendance', error: error.message });
    }
};

module.exports = { getAttendance, markAttendance };
