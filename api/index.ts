try {
    const backend = require('../backend/src/index');
    const app = backend.default || backend;

    // Add a last-minute root health check for Vercel
    if (app && typeof app.get === 'function') {
        app.get('/api/health', (req: any, res: any) => {
            res.json({
                status: 'ok',
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            });
        });
    }

    module.exports = app;
} catch (error: any) {
    console.error('CRITICAL VERCEL BOOT ERROR:', error.message);
    module.exports = (req: any, res: any) => {
        res.status(500).json({ error: 'Server initialization failed', detail: error.message });
    };
}
