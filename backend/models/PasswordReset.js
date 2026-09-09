import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  otp: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  },
  purpose: {
    type: String,
    enum: ["password-reset", "email-verification"],
    default: "password-reset"
  }
}, { timestamps: true });

passwordResetSchema.index({ userId: 1, used: 1, purpose: 1 });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("PasswordReset", passwordResetSchema);
