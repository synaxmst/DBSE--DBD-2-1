import mongoose, { Document, Schema, Types } from 'mongoose';

export type UserRole = 'user' | 'admin' | 'setter';

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  rating: number;
  rank: number;
  solvedProblems: Types.ObjectId[];
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  avatarUrl?: string;
  institution?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'setter'],
      default: 'user',
    },
    rating: {
      type: Number,
      default: 1500,
    },
    rank: {
      type: Number,
      default: 0,
    },
    solvedProblems: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Problem',
      },
    ],
    easySolved: {
      type: Number,
      default: 0,
    },
    mediumSolved: {
      type: Number,
      default: 0,
    },
    hardSolved: {
      type: Number,
      default: 0,
    },
    avatarUrl: {
      type: String,
    },
    institution: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Performance Indexes for User Lookups & Leaderboards
UserSchema.index({ username: 1 });
UserSchema.index({ rating: -1 });
UserSchema.index({ email: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
