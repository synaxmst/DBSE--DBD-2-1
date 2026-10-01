import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISuspiciousMatch {
  submission1Id: Types.ObjectId;
  submission2Id: Types.ObjectId;
  user1Id: Types.ObjectId;
  user2Id: Types.ObjectId;
  user1Username: string;
  user2Username: string;
  problemId: Types.ObjectId;
  problemTitle: string;
  language: string;
  similarity: number;
  matchedTokensCount: number;
  flaggedAt: Date;
}

export interface IPlagiarismReport extends Document {
  _id: Types.ObjectId;
  contestId: Types.ObjectId;
  analyzedSubmissionsCount: number;
  flaggedPairsCount: number;
  matches: ISuspiciousMatch[];
  similarityThreshold: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const SuspiciousMatchSchema = new Schema<ISuspiciousMatch>(
  {
    submission1Id: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
    submission2Id: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
    user1Id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    user2Id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    user1Username: { type: String, required: true },
    user2Username: { type: String, required: true },
    problemId: { type: Schema.Types.ObjectId, ref: 'Problem', required: true },
    problemTitle: { type: String, default: '' },
    language: { type: String, required: true },
    similarity: { type: Number, required: true },
    matchedTokensCount: { type: Number, default: 0 },
    flaggedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PlagiarismReportSchema = new Schema<IPlagiarismReport>(
  {
    contestId: { type: Schema.Types.ObjectId, ref: 'Contest', required: true, index: true },
    analyzedSubmissionsCount: { type: Number, default: 0 },
    flaggedPairsCount: { type: Number, default: 0 },
    matches: [SuspiciousMatchSchema],
    similarityThreshold: { type: Number, default: 0.7 },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  },
  { timestamps: true }
);

export const PlagiarismReport = mongoose.model<IPlagiarismReport>(
  'PlagiarismReport',
  PlagiarismReportSchema
);
