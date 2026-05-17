const { Router } = require('express');
const multer = require('multer');
const { uploadImage } = require('../utils/imagekit');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /upload/presigned-url — returns an ImageKit upload token for client-side direct upload
router.get('/presigned-url', authenticateToken, async (req, res) => {
    try {
        const { fileName, fileType } = req.query;
        if (!fileName || !fileType) return res.status(400).json({ error: 'fileName and fileType are required' });
        // ImageKit doesn't use presigned URLs — return a placeholder for client-side use.
        // Client should POST to /upload/file instead.
        res.json({ message: 'Use POST /upload/file for direct upload via server' });
    } catch (error) {
        res.status(500).json({ error: 'Upload config error', details: error.message });
    }
});

// POST /upload/school-logo — multer → ImageKit
router.post('/school-logo', authenticateToken, upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const schoolId = req.body.schoolId || 'unknown';
        const ext = req.file.originalname.split('.').pop();
        const result = await uploadImage(req.file.buffer, `school-${schoolId}-logo.${ext}`, 'schools');
        res.json({ url: result.url, fileId: result.fileId });
    } catch (error) {
        console.error('UPLOAD ERROR (school-logo):', error.message);
        res.status(500).json({ error: 'Upload failed', details: error.message });
    }
});

// POST /upload/file — generic file upload (student photos, etc.)
router.post('/file', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const folder = req.body.folder || 'uploads';
        const result = await uploadImage(req.file.buffer, req.file.originalname, folder);
        res.json({ url: result.url, fileId: result.fileId });
    } catch (error) {
        console.error('UPLOAD ERROR (file):', error.message);
        res.status(500).json({ error: 'Upload failed', details: error.message });
    }
});

module.exports = router;
