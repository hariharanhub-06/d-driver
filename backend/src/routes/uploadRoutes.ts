const { Router } = require('express');
const multer = require('multer');
const { uploadToS3 } = require('../utils/s3');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/school-logo', authenticateToken, upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        const schoolId = req.body.schoolId;
        const result = await uploadToS3(req.file, `schools/${schoolId}/logo`);
        res.json({ url: result.Location });
    } catch (error) {
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

module.exports = router;
