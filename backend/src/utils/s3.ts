const { S3 } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

const s3 = new S3({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

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

module.exports = { uploadToS3 };
