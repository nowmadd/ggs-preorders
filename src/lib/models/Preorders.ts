import mongoose, { Schema, Document } from "mongoose";

export interface IPreorder extends Document {
  id: string;
  customer_id: string;
  offer_id?: string;
  status?: string;
  total_amount?: number;
  currency?: string;
  created_at?: Date;
  expected_release?: Date;
  payment_status?: string;
  shipping_status?: string;
}

const PreorderSchema = new Schema<IPreorder>({
  id: { type: String, required: true, unique: true },
  customer_id: { type: String, required: true },
  offer_id: String,
  status: { type: String, default: "pending" },
  total_amount: { type: Number, default: 0 },
  currency: { type: String, default: "PHP" },
  created_at: { type: Date, default: Date.now },
  expected_release: Date,
  payment_status: { type: String, default: "unpaid" },
  shipping_status: { type: String, default: "not_shipped" }
});

export default mongoose.models.Preorders || mongoose.model<IPreorder>("Preorders", PreorderSchema);
