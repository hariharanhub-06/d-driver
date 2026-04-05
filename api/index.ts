try {
    const backend = require('../backend/src/index');
    module.exports = backend.default || backend;
} catch (error: any) {
    console.error('VERCEL BOOT ERROR:', error.message);
    module.exports = (req: any, res: any) => {
        res.status(500).json({ error: 'Internal Server Error', message: 'Server fell over at boot' });
    };
}
