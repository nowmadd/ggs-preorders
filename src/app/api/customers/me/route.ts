import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/store/db/connect";
import Customer from "@/lib/models/Customer";

function computeIsComplete(c: any): boolean {
  const phone = c?.phone?.toString().trim();
  const s = c?.shipping ?? {};
  const req = (v: any) => !!v && v.toString().trim().length > 0;
  return !!(
    req(phone) &&
    req(s.street) &&
    req(s.city) &&
    req(s.province) &&
    req(s.zip)
  );
}

// GET /api/customers/me → { customer, is_complete }
export async function GET() {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let doc = await (Customer as any)
    .findOne({ email: session.user.email })
    .lean();

  // First-time login safety: create a minimal profile
  if (!doc) {
    const created = await (Customer as any).create({
      email: session.user.email,
      name: session.user.name,
      image: (session.user as any).image ?? (session.user as any).avatar,
      googleId: (session.user as any).googleId ?? undefined,
      role: (session.user as any).role ?? "user",
    });
    doc = (await (Customer as any).findById(created._id).lean()) as any;
  }

  return NextResponse.json(
    { customer: doc, is_complete: computeIsComplete(doc) },
    { status: 200 }
  );
}

// PATCH /api/customers/me → { customer, is_complete }
export async function PATCH(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const updated = await (Customer as any)
    .findOneAndUpdate(
      { email: session.user.email },
      { $set: body },
      { new: true }
    )
    .lean();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    { customer: updated, is_complete: computeIsComplete(updated) },
    { status: 200 }
  );
}
