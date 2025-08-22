import mongoose, { Schema, Document } from "mongoose";

export interface ICustomer extends Document {
  user_id: string; // NextAuth user id (token.sub)
  google_id?: string; // Google subject id (also token.sub)
  name?: string;
  email?: string;
  avatar?: string;
  phone?: string;
  facebook?: string;
  birthday?: string; // ISO date string "YYYY-MM-DD"
  shipping?: {
    street?: string;
    brgy?: string;
    city?: string;
    province?: string;
    zip?: string;
  };
  created_at?: Date;
  updated_at?: Date;
}

const ShippingSchema = new Schema(
  {
    street: String,
    brgy: String,
    city: String,
    province: String,
    zip: String,
  },
  { _id: false }
);

const CustomerSchema = new Schema<ICustomer>({
  user_id: { type: String, required: true, unique: true, index: true },
  google_id: String,
  name: String,
  email: String,
  avatar: String,
  phone: String,
  facebook: String,
  birthday: String,
  shipping: ShippingSchema,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

CustomerSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.models.Customers ||
  mongoose.model<ICustomer>("Customers", CustomerSchema);
