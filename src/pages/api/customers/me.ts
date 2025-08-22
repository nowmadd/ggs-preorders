// pages/api/customers/me.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import dbConnect from "@/lib/store/db/connect";
import Customer from "@/lib/models/Customer";

const emptyAddr = { street: "", brgy: "", city: "", province: "", zip: "" };

function normalizeAddress(input: any) {
  return {
    street: String(input?.street ?? "").trim(),
    brgy: String(input?.brgy ?? "").trim(),
    city: String(input?.city ?? "").trim(),
    province: String(input?.province ?? "").trim(),
    zip: String(input?.zip ?? "").trim(),
  };
}
function isCompleteProfile(doc: any) {
  const s = doc?.shipping || {};
  return Boolean(
    doc?.phone && s.street && s.brgy && s.city && s.province && s.zip
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) return res.status(401).json({ error: "Unauthorized" });

  const userId = String(token.sub);
  const googleId = String(token.sub);
  const name = token.name || "";
  const email = token.email || "";
  const avatar = (token as any).picture || (token as any).image || "";

  try {
    if (req.method === "GET") {
      // 🔑 Merge by either user_id or email to avoid duplicate inserts
      let doc = await Customer.findOne({
        $or: [{ user_id: userId }, { email }],
      });

      if (!doc) {
        // none found → safe to create a single record
        doc = await Customer.create({
          user_id: userId,
          google_id: googleId,
          name,
          email,
          avatar,
          shipping: emptyAddr,
        });
      } else {
        // keep Google identity fresh (read-only)
        doc.user_id = userId;
        doc.google_id = googleId;
        doc.name = name;
        doc.email = email;
        doc.avatar = avatar;
        await doc.save();
      }

      return res
        .status(200)
        .json({ ok: true, customer: doc, is_complete: isCompleteProfile(doc) });
    }

    if (req.method === "PATCH") {
      const { phone, facebook, birthday, shipping } = req.body || {};

      const $set: any = {
        updated_at: new Date(),
        // keep identity fields in sync on every write
        user_id: userId,
        google_id: googleId,
        name,
        email,
        avatar,
      };
      if (typeof phone === "string") $set.phone = phone.trim();
      if (typeof facebook === "string") $set.facebook = facebook.trim();
      if (typeof birthday === "string") $set.birthday = birthday.trim();
      if (shipping) $set.shipping = normalizeAddress(shipping);

      const doc = await Customer.findOneAndUpdate(
        { $or: [{ user_id: userId }, { email }] }, // 👈 merge selector
        { $set, $setOnInsert: { created_at: new Date() } },
        { new: true, upsert: true }
      );

      return res
        .status(200)
        .json({ ok: true, customer: doc, is_complete: isCompleteProfile(doc) });
    }

    res.setHeader("Allow", "GET,PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
