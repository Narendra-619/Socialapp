import mongoose from "mongoose";

const followRequestSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending"
  }
}, { timestamps: true });

followRequestSchema.index({ requester: 1, recipient: 1 }, { unique: true });
followRequestSchema.index({ recipient: 1, status: 1 });

export default mongoose.model("FollowRequest", followRequestSchema);
