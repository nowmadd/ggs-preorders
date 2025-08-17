import mongoose, { Schema, model, models, type Document } from "mongoose";

export interface IPreorderItem {
  item_id: string;
  quantity: number;
  pricing?: {
    unit_price: number;
    unit_discount_pct?: number; // %
    unit_final_price: number;
    unit_dp: number;
    line_total_price: number;
    line_total_dp: number;
  };
  snapshot?: {
    id: string;
    name: string;
    title?: string;
    description?: string;
    price?: number;
    dp?: number;
    discount?: number;
    category?: string;
    releaseDate?: string;
    image?: string;
    images?: string[];
  };
}

export interface IPreorder extends Document {
  id: string; // business id (e.g., PR-1700000000000)
  offer_id: string; // business id of offer
  customer_id?: string | null;
  items: IPreorderItem[];
  totals: { price: number; downpayment: number };
  status?: "pending" | "paid_partial" | "paid_full" | string;
  created_at?: Date;
  updated_at?: Date;
  payments?: Array<{
    payType: "dp" | "full";
    method: "gcash" | "bank" | "other" | string;
    amount: number;
    reference?: string;
    paidAt?: string;
    // for simplicity; in prod store a URL to S3/Cloudinary instead:
    receipt_image_base64?: string;
  }>;
}

const PreorderItemSchema = new Schema<IPreorderItem>(
  {
    item_id: { type: String, required: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    pricing: {
      unit_price: Number,
      unit_discount_pct: Number,
      unit_final_price: Number,
      unit_dp: Number,
      line_total_price: Number,
      line_total_dp: Number,
    },
    snapshot: {
      id: String,
      name: String,
      title: String,
      description: String,
      price: Number,
      dp: Number,
      discount: Number,
      category: String,
      releaseDate: String,
      image: String,
      images: [String],
    },
  },
  { _id: false }
);

const PreorderSchema = new Schema<IPreorder>(
  {
    id: { type: String, required: true, unique: true }, // business id
    offer_id: { type: String, required: true },
    customer_id: { type: String, default: null },
    items: { type: [PreorderItemSchema], default: [] },
    totals: {
      price: { type: Number, default: 0 },
      downpayment: { type: Number, default: 0 },
    },
    status: { type: String, default: "pending" },
    created_at: { type: Date, default: () => new Date() },
    updated_at: { type: Date, default: () => new Date() },
    payments: [
      {
        payType: String,
        method: String,
        amount: Number,
        reference: String,
        paidAt: String,
        receipt_image_base64: String,
      },
    ],
  },
  { versionKey: false }
);

PreorderSchema.index({ id: 1 }, { unique: true });

export default (models.Preorder as mongoose.Model<IPreorder>) ||
  model<IPreorder>("Preorder", PreorderSchema);
