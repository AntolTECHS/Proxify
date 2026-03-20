import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
    },
    name: String,
    text: String,
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
    },
    authorName: String,
    authorPhoto: String,

    content: {
      type: String,
      required: true,
    },

    image: String,

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Provider",
      },
    ],

    comments: [commentSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Post", postSchema);