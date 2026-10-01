import mongoose, { Document, Schema, Types } from 'mongoose';
import { SupportedLanguage } from './Problem';

export type Verdict =
  | 'Pending'
  | 'Running'
  | 'Accepted'
  | 'Wrong Answer'
  | 'Time Limit Exceeded'
  | 'Memory Limit Exceeded'
  | 'Runtime Error'
  | 'Compilation Error';

export interface ISubmission extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  username?: string;
  problemId: Types.ObjectId;
  problemTitle?: string;
  contestId?: Types.ObjectId;
  language: SupportedLanguage;
  code: string;
  verdict: Verdict;
  executionTimeMs: number;
  memoryKb: number;
  testCasesPassed: number;
  totalTestCases: number;
  stdout?: string;
  errorLog?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    username: { type: String },
    problemId: { type: Schema.Types.ObjectId, ref: 'Problem', required: true, index: true },
    problemTitle: { type: String },
    contestId: { type: Schema.Types.ObjectId, ref: 'Contest', index: true },
    language: { type: String, enum: ['cpp', 'python', 'java', 'javascript'], required: true },
    code: { type: String, required: true },
    verdict: {
      type: String,
      enum: [
        'Pending',
        'Running',
        'Accepted',
        'Wrong Answer',
        'Time Limit Exceeded',
        'Memory Limit Exceeded',
        'Runtime Error',
        'Compilation Error',
      ],
      default: 'Pending',
      index: true,
    },
    executionTimeMs: { type: Number, default: 0 },
    memoryKb: { type: Number, default: 0 },
    testCasesPassed: { type: Number, default: 0 },
    totalTestCases: { type: Number, default: 0 },
    stdout: { type: String },
    errorLog: { type: String },
  },
  { timestamps: true }
);

export const Submission = mongoose.model<ISubmission>('Submission', SubmissionSchema);
