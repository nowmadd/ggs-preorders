import mongoose, { Schema, Document } from "mongoose";

export interface ICustomer extends Document {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country?: string;
  };
  created_at?: Date;
}

const CustomerSchema = new Schema<ICustomer>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  address: {
    line1: String,
    line2: String,
    city: String,
    province: String,
    postal_code: String,
    country: String
  },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.models.Customers || mongoose.model<ICustomer>("Customers", CustomerSchema);
