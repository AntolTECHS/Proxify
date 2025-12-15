const express = require("express");
const { createChat, sendMessage, getChats, getMessages } = require("../controllers/chatController");
const auth = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/", auth, createChat);
router.post("/message", auth, sendMessage);
router.get("/", auth, getChats);
router.get("/:chatId", auth, getMessages);

module.exports = router;
