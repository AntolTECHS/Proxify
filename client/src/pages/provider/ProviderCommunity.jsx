// ProviderCommunity.jsx
import { useState, useEffect } from "react";
import { FaHeart, FaRegCommentDots, FaPaperPlane, FaImage } from "react-icons/fa";
import "../../styles/providerCommunity.css";

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
    <div className="provider-community-page">
      <div className="provider-community-shell">
        <div className="community-hero">
          <div>
            <p className="community-kicker">Provider Network</p>
            <h1 className="community-title">Provider Community</h1>
            <p className="community-subtitle">
              Swap tips, share wins, and help each other solve client challenges faster.
            </p>
          </div>
          <div className="community-hero-card">
            <p className="community-hero-label">Engagement</p>
            <p className="community-hero-value">{posts.length}</p>
            <p className="community-hero-caption">Active discussions</p>
          </div>
        </div>

        <div className="community-highlights">
          <div className="community-highlight-card">
            <p className="community-highlight-label">Weekly tips</p>
            <p className="community-highlight-value">Share your best practices</p>
          </div>
          <div className="community-highlight-card">
            <p className="community-highlight-label">Growth</p>
            <p className="community-highlight-value">Learn from top providers</p>
          </div>
          <div className="community-highlight-card">
            <p className="community-highlight-label">Support</p>
            <p className="community-highlight-value">Get answers fast</p>
          </div>
        </div>

        {error && <div className="community-error">{error}</div>}

        <div className="community-layout">
          <aside className="community-sidebar">
            <div className="community-filters">
              <button type="button" className="community-filter community-filter-active">
                Latest
              </button>
              <button type="button" className="community-filter">
                Most Liked
              </button>
              <button type="button" className="community-filter">
                Tips & Tricks
              </button>
              <button type="button" className="community-filter">
                Questions
              </button>
            </div>

            {/* CREATE POST */}
            <div className="community-composer">
              <div className="community-composer-head">
                <div>
                  <h2 className="community-composer-title">Start a Discussion</h2>
                  <p className="community-composer-subtitle">
                    Share updates, questions, or tips with the provider network.
                  </p>
                </div>
                <div className="community-composer-badge">Live</div>
              </div>

              <textarea
                value={post}
                onChange={(e) => setPost(e.target.value)}
                placeholder="Share a tip, ask a question, or start a discussion..."
                className="community-textarea"
              />

              <div className="community-composer-actions">
                <label className="community-upload">
                  <FaImage />
                  Add photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                </label>

                <button
                  onClick={handlePost}
                  disabled={!post || loading}
                  className="community-post-button"
                >
                  <FaPaperPlane />
                  {loading ? "Posting..." : "Post"}
                </button>
              </div>

              {preview && (
                <div className="community-preview" onClick={() => setModalImage(preview)}>
                  <img src={preview} alt="preview" />
                  <span>Preview</span>
                </div>
              )}
            </div>
          </aside>

          <section className="community-feed-panel">
            <div className="community-feed-header">
              <div>
                <p className="community-feed-kicker">Community Feed</p>
                <h2 className="community-feed-title">Latest Provider Updates</h2>
              </div>
              <div className="community-feed-chip">{posts.length} posts</div>
            </div>

            <div className="community-feed">
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
          </section>
        </div>
      </div>

      {/* MODAL */}
      {modalImage && (
        <div className="community-modal">
          <div className="community-modal-content">
            <img src={modalImage} alt="Enlarged" className="community-modal-image" />
            <button
              className="community-modal-close"
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
    <div className="community-post">
      {/* AUTHOR */}
      <div className="community-post-header">
        {authorPhoto ? (
          <img src={authorPhoto} className="community-avatar" />
        ) : (
          <div className="community-avatar-fallback">
            {authorName[0]}
          </div>
        )}
        <div>
          <p className="community-author">{authorName}</p>
          <p className="community-date">{new Date(post.createdAt).toLocaleString()}</p>
        </div>
        <span className="community-tag">Provider</span>
      </div>

      {/* CONTENT */}
      <p className="community-content">{post.content}</p>

      {/* IMAGE */}
      {post.image && (
        <div className="community-post-image" onClick={() => setModalImage(post.image)}>
          <img src={post.image} alt="post" />
        </div>
      )}

      {/* ACTIONS */}
      <div className="community-actions">
        <button onClick={() => likePost(post._id)} className="community-action">
          <FaHeart /> {post.likes.length} Like
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="community-action"
        >
          <FaRegCommentDots /> {post.comments.length} Comment{post.comments.length !== 1 ? "s" : ""}
        </button>
      </div>

      {/* COMMENTS */}
      {showComments && (
        <div className="community-comments">
          {post.comments.map((c, i) => {
            const commenterName = c.name || "Unknown Provider";
            return (
              <div key={i} className="community-comment">
                <b>{commenterName}</b>: {c.text}
              </div>
            );
          })}
          {/* COMMENT INPUT */}
          <div className="community-comment-input">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment..."
              className="community-input"
            />
            <button
              onClick={() => {
                if (!comment) return;
                addComment(post._id, comment);
                setComment("");
              }}
              className="community-send"
            >
              <FaPaperPlane />
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}