const Document = require("../models/Document");
const User = require("../models/User");

// ------------------- Provider Upload Document -------------------
exports.uploadDocument = async (req, res) => {
  try {
    const { type, name, fileUrl } = req.body;
    const providerId = req.user._id;

    if (!type || !name || !fileUrl) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const doc = await Document.create({
      provider: providerId,
      type,
      name,
      fileUrl,
    });

    return res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------- Get Provider's Own Documents -------------------
exports.getProviderDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ provider: req.user._id });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------- Admin: Get All Documents -------------------
exports.getAllDocuments = async (req, res) => {
  try {
    const docs = await Document.find().populate("provider", "name email");
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------- Admin: Verify / Reject Document -------------------
exports.verifyDocument = async (req, res) => {
  try {
    const { status, notes } = req.body; // status = approved / rejected
    const doc = await Document.findById(req.params.id);

    if (!doc) return res.status(404).json({ message: "Document not found" });

    doc.status = status;
    doc.notes = notes || "";
    await doc.save();

    // Update provider verification if all docs are approved
    if (status === "approved") {
      const providerDocs = await Document.find({ provider: doc.provider });
      const allApproved = providerDocs.every((d) => d.status === "approved");

      if (allApproved) {
        await User.findByIdAndUpdate(doc.provider, {
          isVerified: true,
          verificationStatus: "approved",
          verifiedAt: new Date(),
        });
      }
    }

    // If rejected, mark provider as unverified
    if (status === "rejected") {
      await User.findByIdAndUpdate(doc.provider, {
        isVerified: false,
        verificationStatus: "pending",
      });
    }

    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
