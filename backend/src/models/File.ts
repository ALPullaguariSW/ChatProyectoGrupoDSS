import mongoose, { Document, Schema } from 'mongoose';

export interface IFile extends Document {
  roomId: string;
  userId: string;
  nickname: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  fileHash: string;
  steganographyCheck: {
    checked: boolean;
    passed: boolean;
    entropy?: number;
    details?: string;
  };
  uploadedAt: Date;
  ip: string;
}

const FileSchema: Schema = new Schema(
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
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    fileHash: {
      type: String,
      required: true,
    },
    steganographyCheck: {
      checked: {
        type: Boolean,
        default: false,
      },
      passed: {
        type: Boolean,
        default: false,
      },
      entropy: {
        type: Number,
      },
      details: {
        type: String,
      },
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    ip: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices
FileSchema.index({ roomId: 1, uploadedAt: -1 });
FileSchema.index({ userId: 1 });

export default mongoose.model<IFile>('File', FileSchema);
