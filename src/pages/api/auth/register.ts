// pages/api/auth/register.ts
import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import Customer from "@/lib/models/Customer";

// OPTIONAL: comma-separated admin email list in env, e.g. "owner@ggshobby.com,admin@ggshobby.com"
const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

type Data =
  | { id: string; email: string; role: "admin" | "customer" }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { name, email, password, shopify_account_id } = req.body || {};

    // Basic validation
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    await dbConnect();

    // Duplicate check
    const existing = await Customer.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Role selection (default customer; admin if whitelisted)
    const role: "admin" | "customer" = adminEmails.includes(email.toLowerCase())
      ? "admin"
      : "customer";

    // Create user
    const user = await Customer.create({
      name: typeof name === "string" ? name : undefined,
      email,
      passwordHash,
      role,
      shopify_account_id:
        typeof shopify_account_id === "string" && shopify_account_id.trim()
          ? shopify_account_id.trim()
          : undefined,
    });

    return res
      .status(201)
      .json({ id: String(user._id), email: user.email, role: user.role });
  } catch (err) {
    console.error("REGISTER_ERROR", err);
    return res.status(500).json({ error: "Server error" });
  }
}
