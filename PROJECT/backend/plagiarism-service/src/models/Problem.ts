import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProblem extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  difficulty: string;
}

const ProblemSchema = new Schema<IProblem>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    difficulty: { type: String, required: true },
  },
  { timestamps: true }
);

export const Problem = mongoose.model<IProblem>('Problem', ProblemSchema);
