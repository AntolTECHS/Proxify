// controllers/uploadController.js
import { uploadBuffer } from "../utils/cloudinaryUpload.js";

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await uploadBuffer(req.file.buffer, "chat_images");

    res.json({
      imageUrl: result.secure_url,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};