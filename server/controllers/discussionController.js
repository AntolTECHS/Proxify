const Discussion = require("../models/Discussion");

// Create new discussion
exports.createDiscussion = async (req, res) => {
  try {
    const { title, content } = req.body;
    const discussion = await Discussion.create({ provider: req.user.id, title, content });
    res.status(201).json(discussion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all discussions
exports.getDiscussions = async (req, res) => {
  try {
    const discussions = await Discussion.find().populate("provider", "name email");
    res.json(discussions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reply to discussion
exports.replyDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) return res.status(404).json({ message: "Discussion not found" });

    discussion.replies.push({ user: req.user.id, text: req.body.text });
    await discussion.save();
    res.json(discussion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
