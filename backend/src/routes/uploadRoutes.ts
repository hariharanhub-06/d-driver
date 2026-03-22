import { Router } from 'express';
import { getUploadUrl } from '../utils/s3';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/presigned-url', authenticateToken, async (req, res) => {
    try {
        const { fileName, fileType } = req.query;
        if (!fileName || !fileType) {
            return res.status(400).json({ error: 'Missing fileName or fileType parameters' });
        }

        // Ensure unique filename
        const timestamp = Date.now();
        const safeFileName = `${timestamp}-${(fileName as string).replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        const url = await getUploadUrl(safeFileName, fileType as string);

        // Return both the upload URL and the final S3 URL for saving to the database
        res.json({
            uploadUrl: url,
            finalUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${safeFileName}`
        });
    } catch (error) {
        console.error('S3 Presigned URL Error:', error);
        res.status(500).json({ error: 'Failed to generate presigned URL' });
    }
});

export default router;
