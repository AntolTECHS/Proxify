// ProviderCommunity.jsx
import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function ProviderCommunity() {
  const [post, setPost] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalImage, setModalImage] = useState(null);
  const token = localStorage.getItem("token");

  /* ================= FETCH POSTS ================= */
  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API}/community`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error(err);
      setError("Could not load posts.");
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  /* ================= IMAGE SELECT ================= */
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  /* ================= CREATE POST ================= */
  const handlePost = async () => {
    if (!token) {
      setError("You must be logged in to post.");
      return;
    }
    if (!post.trim()) {
      setError("Post content cannot be empty.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("content", post);
      if (image) formData.append("image", image);

      const res = await fetch(`${API}/community/post`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to create post");
        setLoading(false);
        return;
      }

      setPost("");
      setImage(null);
      setPreview(null);
      fetchPosts();
    } catch (err) {
      console.error("Network error:", err);
      setError("Network error while creating post");
    } finally {
      setLoading(false);
    }
  };

  /* ================= LIKE POST ================= */
  const likePost = async (id) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/community/like/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Like failed");
      fetchPosts();
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= ADD COMMENT ================= */
  const addComment = async (id, text) => {
    if (!token || !text.trim()) return;
    try {
      const res = await fetch(`${API}/community/comment/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Comment error:", data);
        return;
      }
      fetchPosts();
    } catch (err) {
      console.error("Network error:", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold text-sky-500 mb-6">Provider Community</h1>

      {error && <div className="mb-4 text-red-500 font-semibold">{error}</div>}

      {/* CREATE POST */}
      <div className="bg-white border rounded-lg shadow p-6 mb-8">
        <h2 className="font-semibold mb-3">Start a Discussion</h2>
        <textarea
          value={post}
          onChange={(e) => setPost(e.target.value)}
          placeholder="Share a tip, ask a question, or start a discussion..."
          className="w-full border rounded-lg p-3 h-24 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="mt-4 text-sm"
        />
        {preview && (
          <img
            src={preview}
            alt="preview"
            className="mt-4 rounded-lg border object-contain w-32 h-32 cursor-pointer"
            onClick={() => setModalImage(preview)}
          />
        )}
        <button
          onClick={handlePost}
          disabled={!post || loading}
          className="mt-4 bg-sky-500 text-white px-5 py-2 rounded-lg hover:bg-sky-600 transition disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>

      {/* POSTS */}
      <div className="space-y-6">
        {posts.map((p) => (
          <CommunityPost
            key={p._id}
            post={p}
            likePost={likePost}
            addComment={addComment}
            setModalImage={setModalImage}
          />
        ))}
      </div>

      {/* MODAL */}
      {modalImage && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="relative">
            <img src={modalImage} alt="Enlarged" className="max-h-[90vh] max-w-[90vw] rounded-lg" />
            <button
              className="absolute top-2 right-2 bg-gray-200 rounded-full p-1 text-black font-bold hover:bg-gray-300"
              onClick={() => setModalImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= POST COMPONENT ================= */
function CommunityPost({ post, likePost, addComment, setModalImage }) {
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false); // Hides comments by default
  const authorName = post.authorName || post.author?.name || "Unknown Provider";
  const authorPhoto = post.authorPhoto || "";

  return (
    <div className="bg-white border rounded-lg shadow p-5">
      {/* AUTHOR */}
      <div className="flex items-center gap-3">
        {authorPhoto ? (
          <img src={authorPhoto} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
            {authorName[0]}
          </div>
        )}
        <div>
          <p className="font-semibold">{authorName}</p>
          <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString()}</p>
        </div>
      </div>

      {/* CONTENT */}
      <p className="text-gray-700 mt-3">{post.content}</p>

      {/* IMAGE */}
      {post.image && (
        <img
          src={post.image}
          alt="post"
          className="mt-4 w-32 h-32 object-contain rounded-lg border cursor-pointer"
          onClick={() => setModalImage(post.image)}
        />
      )}

      {/* ACTIONS */}
      <div className="flex gap-6 mt-4 text-sm text-gray-500 items-center">
        <button onClick={() => likePost(post._id)} className="hover:text-sky-500">
          👍 {post.likes.length} Like
        </button>

        {/* COMMENT TOGGLE */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="hover:text-sky-500"
        >
          💬 {post.comments.length} Comment{post.comments.length !== 1 ? "s" : ""}
        </button>
      </div>

      {/* COMMENTS */}
      {showComments && (
        <div className="mt-4 space-y-2">
          {post.comments.map((c, i) => {
            const commenterName = c.name || "Unknown Provider";
            return (
              <div key={i} className="text-sm bg-gray-100 p-2 rounded">
                <b>{commenterName}</b>: {c.text}
              </div>
            );
          })}
          {/* COMMENT INPUT */}
          <div className="flex gap-2 mt-3">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 border rounded-lg px-3 py-1 text-sm"
            />
            <button
              onClick={() => {
                if (!comment) return;
                addComment(post._id, comment);
                setComment("");
              }}
              className="bg-sky-500 text-white px-3 rounded"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}