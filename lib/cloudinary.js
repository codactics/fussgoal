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

// Permanently removes uploaded images by public id. Cloudinary's
// delete_resources call accepts at most 100 ids per request, so the list is
// chunked. Never throws — image cleanup is best-effort and must not block the
// database delete it follows.
export async function deleteImagesByPublicId(publicIds = []) {
  const uniqueIds = Array.from(
    new Set(
      (Array.isArray(publicIds) ? publicIds : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );

  if (!uniqueIds.length) {
    return { deleted: 0, failed: 0 };
  }

  let client;

  try {
    client = getCloudinary();
  } catch {
    return { deleted: 0, failed: uniqueIds.length };
  }

  let deleted = 0;
  let failed = 0;

  for (let index = 0; index < uniqueIds.length; index += 100) {
    const batch = uniqueIds.slice(index, index + 100);

    try {
      await client.api.delete_resources(batch, { resource_type: "image", invalidate: true });
      deleted += batch.length;
    } catch {
      failed += batch.length;
    }
  }

  return { deleted, failed };
}
