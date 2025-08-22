import mongoose, { Schema, Document } from "mongoose";

export interface IItem extends Document {
  id: string;
  name: string;
  description?: string;
  price: number;
  dp: number;
  discount: number;
  category?: string;
  releaseDate?: string | Date;
  image?: string;
  images?: string[];
  title?: string;

  game?: {
    id: string;
    game_title: string;
    game_image?: string;
  };
}

const GameSnapSchema = new Schema(
  {
    id: { type: String, required: true },
    game_title: { type: String, required: true },
    game_image: { type: String },
  },
  { _id: false }
);

const ItemSchema = new Schema<IItem>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  title: String,
  description: String,
  price: { type: Number, required: true },
  dp: { type: Number, required: true },
  discount: Number,
  category: String,
  releaseDate: Date,
  image: { type: String },
  images: [{ type: String }],
  game: { type: GameSnapSchema },
});

export default mongoose.models.Items ||
  mongoose.model<IItem>("Items", ItemSchema);
