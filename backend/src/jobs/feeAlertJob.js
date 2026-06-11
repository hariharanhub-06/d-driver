const cron = require('node-cron');
const prisma = require('../prisma');
const { notifyUser } = require('../utils/notifications');

// Runs daily at 9:00 AM IST (03:30 UTC)
const startFeeAlertJob = () => {
    cron.schedule('30 3 * * *', async () => {
        console.log('[FeeAlertJob] Running daily fee alert check...');
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const in3Days = new Date(today);
            in3Days.setDate(in3Days.getDate() + 3);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Get all unpaid fees with parent info
            const fees = await prisma.fee.findMany({
                where: { due_amount: { gt: 0 } },
                include: {
                    student: {
                        include: { parent: { select: { id: true } } },
                    },
                },
            });

            for (const fee of fees) {
                const parentId = fee.student?.parent?.id;
                if (!parentId) continue;

                const dueDate = new Date(fee.due_date);
                const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

                // Dedup: skip if alert was already sent today
                if (fee.last_alert_sent_at) {
                    const lastSent = new Date(fee.last_alert_sent_at);
                    const lastSentDay = new Date(lastSent.getFullYear(), lastSent.getMonth(), lastSent.getDate());
                    if (lastSentDay.getTime() === today.getTime()) continue;
                }

                let msg = null;

                if (dueDateOnly.getTime() === in3Days.getTime()) {
                    msg = `Reminder: Transport fee ₹${fee.due_amount.toLocaleString('en-IN')} for ${fee.student.name} is due in 3 days (${dueDate.toLocaleDateString('en-IN')}).`;
                } else if (dueDateOnly.getTime() === today.getTime()) {
                    msg = `Due Today: Transport fee ₹${fee.due_amount.toLocaleString('en-IN')} for ${fee.student.name} is due today.`;
                } else if (dueDateOnly < today) {
                    msg = `Overdue: Transport fee ₹${fee.due_amount.toLocaleString('en-IN')} for ${fee.student.name} is overdue since ${dueDate.toLocaleDateString('en-IN')}.`;
                }

                if (msg) {
                    await notifyUser(parentId, msg, 'alert', fee.school_id);
                    await prisma.fee.update({
                        where: { id: fee.id },
                        data: { last_alert_sent_at: now },
                    });
                }
            }

            console.log('[FeeAlertJob] Done.');
        } catch (err) {
            console.error('[FeeAlertJob] Error:', err.message);
        }
    }, { timezone: 'Asia/Kolkata' });

    console.log('[FeeAlertJob] Scheduled daily at 9:00 AM IST');
};

module.exports = { startFeeAlertJob };
