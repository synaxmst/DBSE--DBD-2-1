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
    username: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'setter'], default: 'user' },
    rating: { type: Number, default: 1500 },
    rank: { type: Number, default: 0 },
    solvedProblems: [{ type: Schema.Types.ObjectId, ref: 'Problem' }],
    easySolved: { type: Number, default: 0 },
    mediumSolved: { type: Number, default: 0 },
    hardSolved: { type: Number, default: 0 },
    avatarUrl: { type: String },
    institution: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
