import Draft from "../models/Draft.js";

export const getDrafts = async (req, res) => {
  try {
    const drafts = await Draft.find({ userId: req.user._id })
      .sort({ updatedAt: -1 });
    res.status(200).json(drafts);
  } catch (error) {
    console.error("GET DRAFTS ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const createDraft = async (req, res) => {
  try {
    const { text, image, video } = req.body;
    if (text && text.length > 5000) {
      return res.status(400).json({ error: "Draft text must be under 5000 characters" });
    }

    const draftCount = await Draft.countDocuments({ userId: req.user._id });
    if (draftCount >= 50) {
      return res.status(400).json({ error: "Maximum 50 drafts allowed. Please delete some drafts first." });
    }

    const draft = new Draft({
      userId: req.user._id,
      text: text || "",
      image: image || "",
      video: video || ""
    });
    await draft.save();
    res.status(201).json({ message: "Draft saved", draft });
  } catch (error) {
    console.error("CREATE DRAFT ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateDraft = async (req, res) => {
  try {
    const draft = await Draft.findOne({ _id: req.params.id, userId: req.user._id });
    if (!draft) return res.status(404).json({ error: "Draft not found" });

    const { text, image, video } = req.body;
    if (text !== undefined) {
      if (typeof text === "string" && text.length > 5000) {
        return res.status(400).json({ error: "Draft text must be under 5000 characters" });
      }
      draft.text = text || "";
    }
    if (image !== undefined) draft.image = image;
    if (video !== undefined) draft.video = video;
    await draft.save();

    res.status(200).json({ message: "Draft updated", draft });
  } catch (error) {
    console.error("UPDATE DRAFT ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteDraft = async (req, res) => {
  try {
    const draft = await Draft.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!draft) return res.status(404).json({ error: "Draft not found" });
    res.status(200).json({ message: "Draft deleted" });
  } catch (error) {
    console.error("DELETE DRAFT ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};
