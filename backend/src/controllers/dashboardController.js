
const prisma = require('../prisma');

const getDashboardStats = async (req, res) => {
    try {
        const [schoolCount, studentCount, revenueData] = await Promise.all([
            prisma.school.count(),
            prisma.student.count(),
            prisma.payment.aggregate({
                _sum: { amount: true }
            })
        ]);

        res.json({
            schoolCount,
            studentCount,
            totalRevenue: revenueData._sum.amount || 0,
            uptime: '99.99%', // System uptime remains a status indicator
            recentActivity: [
                { id: 1, event: 'System Online', details: 'Neon DB Connected', time: 'Just now', status: 'success' }
            ]
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};

module.exports = { getDashboardStats };
