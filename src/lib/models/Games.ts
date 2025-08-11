import mongoose, { Schema, Document } from "mongoose";

export interface IGame extends Document {
  game_code: string;
  game_title: string;
}

const GameSchema = new Schema<IGame>({
  game_code: { type: String, required: true, unique: true },
  game_title: { type: String, required: true },
});

export default mongoose.models.Items ||
  mongoose.model<IGame>("Games", GameSchema);
