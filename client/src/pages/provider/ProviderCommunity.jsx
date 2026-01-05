import { useState } from "react";

export default function ProviderCommunity() {
  const [post, setPost] = useState("");

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold text-teal-600 mb-6">
        Provider Community
      </h1>

      {/* CREATE POST */}
      <div className="bg-white border rounded-lg shadow p-6 mb-8">
        <h2 className="font-semibold mb-3">Start a Discussion</h2>
        <textarea
          value={post}
          onChange={(e) => setPost(e.target.value)}
          placeholder="Share a tip, ask a question, or start a discussion..."
          className="w-full border rounded-lg p-3 h-24 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          disabled={!post}
          className="mt-3 bg-teal-600 text-white px-5 py-2 rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
        >
          Post
        </button>
      </div>

      {/* POSTS */}
      <div className="space-y-6">
        <CommunityPost
          author="Alex (Electrician)"
          content="What’s the best way to price emergency electrical work?"
        />
        <CommunityPost
          author="Maria (Cleaner)"
          content="Anyone using eco-friendly cleaning products? Recommendations?"
        />
        <CommunityPost
          author="David (Plumber)"
          content="How do you handle customers who reschedule last minute?"
        />
      </div>
    </div>
  );
}

/* --------- COMPONENT --------- */

function CommunityPost({ author, content }) {
  return (
    <div className="bg-white border rounded-lg shadow p-5">
      <p className="font-semibold">{author}</p>
      <p className="text-gray-700 mt-2">{content}</p>

      <div className="flex gap-4 mt-4 text-sm text-gray-500">
        <button className="hover:text-teal-600">Reply</button>
        <button className="hover:text-teal-600">Like</button>
      </div>
    </div>
  );
}
