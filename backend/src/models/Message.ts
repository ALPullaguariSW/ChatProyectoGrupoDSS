import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  roomId: string;
  userId: string;
  nickname: string;
  message: string;
  encrypted: boolean;
  messageHash: string;
  ip: string;
  timestamp: Date;
  edited: boolean;
  deleted: boolean;
}

const MessageSchema: Schema = new Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
    },
    nickname: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    encrypted: {
      type: Boolean,
      default: false,
    },
    messageHash: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    edited: {
      type: Boolean,
      default: false,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Índices compuestos para consultas eficientes
MessageSchema.index({ roomId: 1, timestamp: -1 });
MessageSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
