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
    console.error('CRITICAL VERCEL BOOT ERROR:', error);
    module.exports = (req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({
            error: 'Server initialization failed',
            message: error.message,
            stack: error.stack,
            env_check: {
                has_db_url: !!process.env.DATABASE_URL,
                has_jwt_secret: !!process.env.JWT_SECRET,
                node_env: process.env.NODE_ENV
            }
        });
    };
}
