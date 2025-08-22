import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
const BUCKET = process.env.S3_BUCKET!;
const s3 = new S3Client({ region: REGION });

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key)
      return NextResponse.json({ error: "Missing key" }, { status: 400 });

    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 300 }); // 5 min
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 400 }
    );
  }
}
