import mongoose, { Document, Schema, Types } from 'mongoose';

export type ContestStatus = 'upcoming' | 'live' | 'ended';

export interface IFinalRanking {
  rank: number;
  userId: Types.ObjectId;
  username: string;
  score: number;
  solvedCount: number;
  penaltyMinutes: number;
}

export interface IContest extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  problemIds: Types.ObjectId[];
  registeredUserIds: Types.ObjectId[];
  createdBy?: Types.ObjectId;
  status: ContestStatus;
  scoringMode?: string;
  bannerBadge?: string;
  editorial?: string;
  finalRankings: IFinalRanking[];
  createdAt: Date;
  updatedAt: Date;
}

const FinalRankingSchema = new Schema<IFinalRanking>(
  {
    rank: { type: Number, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    score: { type: Number, required: true },
    solvedCount: { type: Number, required: true },
    penaltyMinutes: { type: Number, required: true },
  },
  { _id: false }
);

const ContestSchema = new Schema<IContest>(
  {
    title: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    description: { type: String },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, required: true, default: 90 },
    problemIds: [{ type: Schema.Types.ObjectId, ref: 'Problem' }],
    registeredUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['upcoming', 'live', 'ended'], default: 'upcoming', index: true },
    scoringMode: { type: String, default: 'ICPC' },
    bannerBadge: { type: String, default: 'Rated' },
    editorial: { type: String, default: '' },
    finalRankings: [FinalRankingSchema],
  },
  { timestamps: true }
);

export const Contest = mongoose.model<IContest>('Contest', ContestSchema);
