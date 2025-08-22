import { NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
const BUCKET = process.env.S3_BUCKET!;
const s3 = new S3Client({ region: REGION });

export async function POST(req: Request) {
  try {
    const { key } = await req.json();
    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    // Optional guard: only allow known prefixes
    const allowed = /^items\/|^receipts\/|^users\//;
    if (!allowed.test(key)) {
      return NextResponse.json(
        { error: "Forbidden key prefix" },
        { status: 400 }
      );
    }

    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("S3 delete error:", err);
    return NextResponse.json(
      { error: err?.message || "S3 delete failed" },
      { status: 500 }
    );
  }
}
