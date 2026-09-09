import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
    type: {
      type: String,
      enum: ["like", "comment", "welcome", "follow", "follow_request", "follow_accept", "mention"],
      required: true
    },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post"
  },
  followRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FollowRequest"
  },
  message: {
    type: String
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 }); // M12: covers main sort query

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
