import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  userId: string;
  username?: string;
  ip: string;
  userAgent?: string;
  metadata?: any;
  timestamp: Date;
  signature: string;
}

const AuditLogSchema: Schema = new Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    username: {
      type: String,
    },
    ip: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    signature: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

// Prevenir modificaciones (append-only)
AuditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    next(new Error('Los logs de auditoría no pueden ser modificados'));
  }
  next();
});

// Índices compuestos
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
