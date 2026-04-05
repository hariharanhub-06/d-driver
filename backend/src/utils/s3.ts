export { };
const { S3, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const getPresignedUrl = async (fileName, fileType) => {
    const key = `uploads/${Date.now()}-${fileName}`;
    const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        ContentType: fileType
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const finalUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return { uploadUrl, finalUrl };
};

const uploadToS3 = async (file, path) => {
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
};

module.exports = { uploadToS3, getPresignedUrl };
