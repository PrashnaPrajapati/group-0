const ImageKit = require("@imagekit/nodejs");

const getImageKitClient = () => {
  if (!process.env.IMAGEKIT_PRIVATE_KEY) {
    throw new Error("IMAGEKIT_PRIVATE_KEY is not configured");
  }

  return new ImageKit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  });
};

module.exports = {
  getImageKitClient,
};
