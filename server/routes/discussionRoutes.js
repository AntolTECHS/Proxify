const express = require("express");
const { createDiscussion, getDiscussions, replyDiscussion } = require("../controllers/discussionController");
const auth = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/", auth, createDiscussion);
router.get("/", auth, getDiscussions);
router.post("/:id/reply", auth, replyDiscussion);

module.exports = router;
