import mongoose, { Schema, Document } from "mongoose";

export interface IPreorderOffer extends Document {
  id: string; // business id e.g. OFFER-...
  title: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  active: boolean;
  banner?: string;
  created_at?: Date;
}

const PreorderOfferSchema = new Schema<IPreorderOffer>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  active: { type: Boolean, default: true },
  banner: String,
  created_at: { type: Date, default: Date.now },
});

export default mongoose.models.PreorderOffers ||
  mongoose.model<IPreorderOffer>("PreorderOffers", PreorderOfferSchema);
