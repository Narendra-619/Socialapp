import Notification from "../models/Notification.js";

export const getNotifications = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate("sender", "username profilePicture")
      .populate("post", "text image")
      .populate("followRequest")
      .sort({ createdAt: -1 })
      .limit(limit);
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const markAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ message: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const markSingleAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { read: true } },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id
    });
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.status(200).json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
