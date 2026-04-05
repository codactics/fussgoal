import { v2 as cloudinary } from "cloudinary";

let isConfigured = false;

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }

  return value;
}

export function getCloudinary() {
  if (!isConfigured) {
    cloudinary.config({
      cloud_name: getRequiredEnv("CLOUDINARY_CLOUD_NAME"),
      api_key: getRequiredEnv("CLOUDINARY_API_KEY"),
      api_secret: getRequiredEnv("CLOUDINARY_API_SECRET"),
    });

    isConfigured = true;
  }

  return cloudinary;
}
