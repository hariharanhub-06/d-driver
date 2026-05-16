const ImageKit = require('imagekit');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

/**
 * Upload a file buffer to ImageKit.
 * @param {Buffer} buffer
 * @param {string} fileName
 * @param {string} folder  e.g. "schools", "students"
 * @returns {Promise<{ url: string, fileId: string }>}
 */
const uploadImage = async (buffer, fileName, folder = 'uploads') => {
  const response = await imagekit.upload({
    file: buffer,
    fileName,
    folder: `/${folder}`,
    useUniqueFileName: true,
  });
  return { url: response.url, fileId: response.fileId };
};

/**
 * Delete a file from ImageKit by fileId.
 * @param {string} fileId
 */
const deleteImage = async (fileId) => {
  await imagekit.deleteFile(fileId);
};

module.exports = { uploadImage, deleteImage };
