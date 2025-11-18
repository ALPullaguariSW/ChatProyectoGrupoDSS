import mongoose, { Document, Schema } from 'mongoose';

export interface IRoomUser {
  userId: string;
  nickname: string;
  ip: string;
  deviceId: string;
  joinedAt: Date;
}

export interface IRoom extends Document {
  pin: string;
  name: string;
  type: 'text' | 'multimedia';
  limit: number;
  creatorId: string;
  creatorNickname: string;
  users: IRoomUser[];
  ephemeralKey: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoomUserSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  nickname: {
    type: String,
    required: true,
    trim: true,
  },
  ip: {
    type: String,
    required: true,
  },
  deviceId: {
    type: String,
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

const RoomSchema: Schema = new Schema(
  {
    pin: {
      type: String,
      required: true,
      unique: true,
      length: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    type: {
      type: String,
      enum: ['text', 'multimedia'],
      required: true,
    },
    limit: {
      type: Number,
      required: true,
      min: 2,
      max: 50,
    },
    creatorId: {
      type: String,
      required: true,
    },
    creatorNickname: {
      type: String,
      required: true,
    },
    users: [RoomUserSchema],
    ephemeralKey: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para búsquedas rápidas
RoomSchema.index({ pin: 1 });
RoomSchema.index({ creatorId: 1 });
RoomSchema.index({ isActive: 1 });

export default mongoose.model<IRoom>('Room', RoomSchema);
