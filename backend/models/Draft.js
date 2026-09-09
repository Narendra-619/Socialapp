import mongoose from "mongoose";

const draftSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  text: {
    type: String,
    default: ""
  },
  image: {
    type: String,
    default: ""
  },
  video: {
    type: String,
    default: ""
  }
}, { timestamps: true });

draftSchema.index({ userId: 1 });

export default mongoose.model("Draft", draftSchema);
