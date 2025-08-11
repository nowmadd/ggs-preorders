import mongoose, { Schema, Document } from "mongoose";

export interface IPreorderOfferItem extends Document {
  offer_id: string; // business id of offer (OFFER-...)
  item_id: string; // business id of item (ITEM-...)
  sort?: number;
  created_at?: Date;
}

const PreorderOfferItemSchema = new Schema<IPreorderOfferItem>({
  offer_id: { type: String, required: true, index: true },
  item_id: { type: String, required: true, index: true },
  sort: Number,
  created_at: { type: Date, default: Date.now },
});

// one item per offer (no duplicates)
PreorderOfferItemSchema.index({ offer_id: 1, item_id: 1 }, { unique: true });

export default mongoose.models.PreorderOfferItems ||
  mongoose.model<IPreorderOfferItem>(
    "PreorderOfferItems",
    PreorderOfferItemSchema
  );
