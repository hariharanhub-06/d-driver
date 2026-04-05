try {
    const backend = require('../backend/src/index');
    module.exports = backend.default || backend;
} catch (error) {
    console.error('VERCEL BOOT ERROR:', error);
    module.exports = (req, res) => {
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Server fell over at boot',
            details: error.message,
            stack: error.stack
        });
    };
}
