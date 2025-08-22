import mongoose, { Schema, Document } from "mongoose";

export interface IGame extends Document {
  id: string; // business id e.g. "GAME-..."
  game_title: string;
  game_image?: string; // S3 key
}

const GameSchema = new Schema<IGame>(
  {
    id: { type: String, required: true, unique: true, index: true },
    game_title: { type: String, required: true },
    game_image: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Games ||
  mongoose.model<IGame>("Games", GameSchema);
