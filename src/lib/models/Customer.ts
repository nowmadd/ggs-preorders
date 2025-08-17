// lib/models/Customer.ts
import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "admin" | "customer";

export interface ICustomer extends Document {
  name?: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
  image?: string;
  shopify_account_id?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// lib/models/Customer.ts (no `id` field here)
const CustomerSchema = new Schema(
  {
    name: String,
    email: { type: String, unique: true, required: true, index: true },
    passwordHash: String,
    googleId: { type: String, index: true },
    image: String,
    shopify_account_id: { type: String, index: true },
    role: {
      type: String,
      enum: ["admin", "customer"],
      default: "customer",
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);
