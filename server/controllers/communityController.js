// controllers/communityController.js
import Post from "../models/CommunityPost.js";
import { uploadBuffer } from "../utils/cloudinaryUpload.js";

/* ================= CREATE POST ================= */
export const createPost = async (req, res) => {
  try {
    const { content } = req.body;

    // 1️⃣ Ensure user is logged in
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    // 2️⃣ Determine author name and photo with fallbacks
    // Use provider profile if exists, else fallback to user.name, then "Provider"
    const providerName =
      req.user.profile?.basicInfo?.providerName?.trim() ||
      req.user.basicInfo?.providerName?.trim() ||
      req.user.name ||
      "Provider";

    const providerPhoto =
      req.user.profile?.basicInfo?.photoURL ||
      req.user.basicInfo?.photoURL ||
      "";

    // 3️⃣ Handle image upload
    let imageUrl = "";
    if (req.file) {
      const result = await uploadBuffer(req.file.buffer, "servlink/community");
      imageUrl = result.secure_url;
    }

    // 4️⃣ Create post in DB
    const post = await Post.create({
      author: req.user._id,
      authorName: providerName,
      authorPhoto: providerPhoto,
      content,
      image: imageUrl,
    });

    res.json({ success: true, post });
  } catch (error) {
    console.error("Create post error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create post" });
  }
};

/* ================= GET POSTS ================= */
export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};

/* ================= LIKE POST ================= */
export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Toggle like
    if (!post.likes.includes(req.user._id)) {
      post.likes.push(req.user._id);
    } else {
      post.likes = post.likes.filter(
        (id) => id.toString() !== req.user._id.toString()
      );
    }

    await post.save();
    res.json(post);
  } catch (error) {
    console.error("Like post error:", error);
    res.status(500).json({ message: "Like failed" });
  }
};

/* ================= ADD COMMENT ================= */
export const addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Always provide commenter name
    const commenterName =
      req.user.profile?.basicInfo?.providerName?.trim() ||
      req.user.basicInfo?.providerName?.trim() ||
      req.user.name ||
      "Provider";

    const comment = {
      user: req.user._id,
      name: commenterName,
      text: req.body.text,
    };

    post.comments.push(comment);
    await post.save();

    res.json(post);
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ message: "Comment failed" });
  }
};