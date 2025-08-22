import mongoose, { Schema, Document } from "mongoose";

export interface IPreorderOffer extends Document {
  id: string; // business id, e.g., OFFER-123
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  active: boolean;
  banner?: string; // S3 key (optional)
  logo?: string; // S3 key (optional)
}

const PreorderOfferSchema = new Schema<IPreorderOffer>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  start_date: { type: String, required: true },
  end_date: { type: String, required: true },
  active: { type: Boolean, default: true },
  banner: String,
  logo: String,
});

export default (mongoose.models
  .PreorderOffers as mongoose.Model<IPreorderOffer>) ||
  mongoose.model<IPreorderOffer>("PreorderOffers", PreorderOfferSchema);
