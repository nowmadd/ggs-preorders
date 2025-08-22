import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
const BUCKET = process.env.S3_BUCKET!;
const s3 = new S3Client({ region: REGION });

async function makePresign({
  filename,
  contentType,
  folder,
}: {
  filename: string;
  contentType: string;
  folder: string;
}) {
  if (!BUCKET) throw new Error("Missing S3_BUCKET");
  if (!contentType?.startsWith("image/"))
    throw new Error("Only image uploads allowed");

  const ext = filename?.includes(".") ? filename.split(".").pop() : "bin";
  const key = `${folder || "misc"}/${randomUUID()}.${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });

  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 120 });
  return { uploadUrl, key };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename") || "file";
    const contentType =
      searchParams.get("contentType") || "application/octet-stream";
    const folder = searchParams.get("folder") || "items";
    const out = await makePresign({ filename, contentType, folder });
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      filename = "file",
      contentType = "application/octet-stream",
      folder = "items",
    } = await req.json();
    const out = await makePresign({ filename, contentType, folder });
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 400 }
    );
  }
}
