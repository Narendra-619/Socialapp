import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post"
    }
  ]
}, { timestamps: true });

collectionSchema.index({ userId: 1, name: 1 }, { unique: true });
collectionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Collection", collectionSchema);
