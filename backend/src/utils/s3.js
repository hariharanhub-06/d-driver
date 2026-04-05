const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const getPresignedUrl = async (fileName, fileType) => {
    try {
        const key = `uploads/${Date.now()}-${fileName}`;
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            ContentType: fileType
        });

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        const finalUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

        return { uploadUrl, finalUrl };
    } catch (error) {
        console.error('S3 ERROR (getPresignedUrl):', error);
        throw error;
    }
};

const uploadToS3 = async (file, path) => {
    try {
        const upload = new Upload({
            client: s3,
            params: {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: `${path}-${Date.now()}-${file.originalname}`,
                Body: file.buffer,
                ContentType: file.mimetype
            }
        });
        return await upload.done();
    } catch (error) {
        console.error('S3 ERROR (uploadToS3):', error);
        throw error;
    }
};

module.exports = { uploadToS3, getPresignedUrl };
