import mongoose, { Document, Schema, Types } from 'mongoose';

export type ContestStatus = 'upcoming' | 'live' | 'ended';

export interface IContest extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  startTime: Date;
  endTime: Date;
  problemIds: Types.ObjectId[];
  registeredUserIds: Types.ObjectId[];
  status: ContestStatus;
  editorial?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContestSchema = new Schema<IContest>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    problemIds: [{ type: Schema.Types.ObjectId, ref: 'Problem' }],
    registeredUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['upcoming', 'live', 'ended'], default: 'upcoming' },
    editorial: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Contest = mongoose.model<IContest>('Contest', ContestSchema);
