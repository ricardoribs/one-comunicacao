const { v2: cloudinary } = require('cloudinary');
const env = require('./env');

if (env.uploadProvider === 'cloudinary') {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
  });
}

module.exports = cloudinary;
