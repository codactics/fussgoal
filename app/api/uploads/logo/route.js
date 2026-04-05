import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "../../../../lib/adminAuth";
import { getCloudinary } from "../../../../lib/cloudinary";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function getUploadFolder(kind) {
  if (kind === "tournament") {
    return "fussgoal/tournament-logos";
  }

  return "fussgoal/team-logos";
}

function uploadBuffer(buffer, options) {
  const cloudinary = getCloudinary();

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(options, (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      })
      .end(buffer);
  });
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const session = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const kind = String(formData.get("kind") || "team");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "No file uploaded." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ message: "Only image uploads are allowed." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { message: "Image must be 5MB or smaller." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const result = await uploadBuffer(buffer, {
      folder: getUploadFolder(kind),
      resource_type: "image",
    });

    return NextResponse.json({
      image: {
        name: file.name,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to upload the image right now.",
      },
      { status: 500 }
    );
  }
}
