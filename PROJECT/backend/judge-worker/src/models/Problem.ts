import mongoose, { Document, Schema, Types } from 'mongoose';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type SupportedLanguage = 'cpp' | 'python' | 'java' | 'javascript';
export type ProblemStatus = 'draft' | 'published' | 'archived';

export interface ITestCase {
  id?: string;
  input: string;
  expectedOutput: string;
  explanation?: string;
}

export interface IProblem extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  difficulty: Difficulty;
  timeLimitMs: number;
  memoryLimitMb: number;
  tags: string[];
  constraints: string[];
  sampleTestCases: ITestCase[];
  hiddenTestCases: ITestCase[];
  status: ProblemStatus;
  isPublished: boolean;
  submissionsCount: number;
  totalAccepted: number;
  createdAt: Date;
  updatedAt: Date;
}

const TestCaseSchema = new Schema<ITestCase>(
  {
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    explanation: { type: String },
  },
  { _id: false }
);

const ProblemSchema = new Schema<IProblem>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    timeLimitMs: { type: Number, required: true, default: 1000 },
    memoryLimitMb: { type: Number, required: true, default: 256 },
    tags: [{ type: String }],
    constraints: [{ type: String }],
    sampleTestCases: [TestCaseSchema],
    hiddenTestCases: [TestCaseSchema],
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    isPublished: { type: Boolean, default: false },
    submissionsCount: { type: Number, default: 0 },
    totalAccepted: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Problem = mongoose.model<IProblem>('Problem', ProblemSchema);
