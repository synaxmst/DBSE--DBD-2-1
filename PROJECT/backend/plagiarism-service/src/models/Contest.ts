import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IContest extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  status: string;
  problemIds: Types.ObjectId[];
}

const ContestSchema = new Schema<IContest>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    status: { type: String, default: 'upcoming' },
    problemIds: [{ type: Schema.Types.ObjectId, ref: 'Problem' }],
  },
  { timestamps: true }
);

export const Contest = mongoose.model<IContest>('Contest', ContestSchema);
