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

export interface IStarterCode {
  cpp: string;
  python: string;
  java: string;
  javascript: string;
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
  starterCode: IStarterCode;
  authorId?: Types.ObjectId;
  authorName?: string;
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

const StarterCodeSchema = new Schema<IStarterCode>(
  {
    cpp: { type: String, default: '' },
    python: { type: String, default: '' },
    java: { type: String, default: '' },
    javascript: { type: String, default: '' },
  },
  { _id: false }
);

const ProblemSchema = new Schema<IProblem>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
      index: true,
    },
    timeLimitMs: {
      type: Number,
      required: true,
      default: 1000,
      min: 100,
      max: 10000,
    },
    memoryLimitMb: {
      type: Number,
      required: true,
      default: 256,
      min: 16,
      max: 1024,
    },
    tags: [
      {
        type: String,
        trim: true,
        index: true,
      },
    ],
    constraints: [
      {
        type: String,
      },
    ],
    sampleTestCases: [TestCaseSchema],
    hiddenTestCases: [TestCaseSchema],
    starterCode: {
      type: StarterCodeSchema,
      default: () => ({
        cpp: '',
        python: '',
        java: '',
        javascript: '',
      }),
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    authorName: {
      type: String,
      default: 'AlgoFlow Editorial',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    submissionsCount: {
      type: Number,
      default: 0,
    },
    totalAccepted: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound & Single Indexes for high-frequency queries
ProblemSchema.index({ difficulty: 1 });
ProblemSchema.index({ tags: 1 });
ProblemSchema.index({ difficulty: 1, tags: 1 });
ProblemSchema.index({ status: 1, createdAt: -1 });
ProblemSchema.index({ isPublished: 1, createdAt: -1 });

export const Problem = mongoose.model<IProblem>('Problem', ProblemSchema);
