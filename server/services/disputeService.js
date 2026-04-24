import Dispute from "../models/Dispute.js";
import DisputeMessage from "../models/DisputeMessage.js";
import DisputeEvidence from "../models/DisputeEvidence.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import {
  uploadBuffer,
  deleteCloudinaryFile,
} from "../utils/cloudinaryUpload.js";

/* ================= CONSTANTS ================= */

const ACTIVE_DISPUTE_STATUSES = ["open", "responded", "under_review"];

/* ================= HELPERS ================= */

const toStringId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return value._id.toString();
  if (typeof value === "object" && typeof value.toString === "function") {
    return value.toString();
  }
  return null;
};

const getProviderUserId = (provider) => {
  if (!provider) return null;

  if (typeof provider === "string") return provider;

  if (provider.user) return toStringId(provider.user);
  if (provider.userId) return toStringId(provider.userId);
  if (provider.owner) return toStringId(provider.owner);
  if (provider.accountId) return toStringId(provider.accountId);

  return toStringId(provider._id);
};

const getUserDisplayName = (user) => {
  if (!user) return "";

  return (
    user?.basicInfo?.fullName ||
    user?.basicInfo?.providerName ||
    user?.name ||
    user?.fullName ||
    user?.email ||
    ""
  );
};

const getBookingServiceName = (booking) => {
  return booking?.serviceName || "Booking";
};

const assertUserIsDisputeParticipant = (dispute, user) => {
  const isAdmin = user?.role === "admin";
  const isOpenedBy = toStringId(dispute.openedBy) === toStringId(user?._id);
  const isAgainst = toStringId(dispute.against) === toStringId(user?._id);

  if (!isAdmin && !isOpenedBy && !isAgainst) {
    throw new Error("Forbidden");
  }
};

const assertUserCanCloseDispute = (user) => {
  if (user?.role !== "admin") {
    throw new Error("Only admins can close disputes.");
  }
};

const syncBookingDispute = async (bookingId, dispute) => {
  const bookingObjectId = toStringId(bookingId);
  if (!bookingObjectId) return;

  const disputeId = dispute?._id ? toStringId(dispute._id) : toStringId(dispute);
  const disputeStatus = dispute?.status || "none";

  await Booking.findByIdAndUpdate(bookingObjectId, {
    hasDispute: Boolean(disputeId),
    disputeId: disputeId || null,
    disputeStatus: disputeStatus || "none",
  });
};

const normalizeMessage = (msg, currentUserId = null) => {
  if (!msg) return msg;

  const plain = typeof msg.toObject === "function" ? msg.toObject() : { ...msg };

  const senderObj =
    plain.senderId && typeof plain.senderId === "object" ? plain.senderId : null;

  const senderRaw =
    plain.senderId ||
    plain.sender ||
    plain.userId ||
    plain.createdBy ||
    plain.uploadedBy ||
    null;

  const senderId = toStringId(senderRaw);
  const mine = currentUserId ? senderId === toStringId(currentUserId) : false;

  const senderName =
    plain.senderName ||
    senderObj?.name ||
    senderObj?.fullName ||
    senderObj?.email ||
    (plain.isSystemMessage ? "System" : mine ? "You" : "Unknown");

  const senderRole =
    plain.senderRole || senderObj?.role || plain.messageType || "user";

  return {
    ...plain,
    senderId: senderId || plain.senderId || null,
    sender: senderObj || plain.sender || null,
    senderName,
    senderRole,
    self: mine || plain.self === true,
    isMine: mine || plain.isMine === true,
  };
};

const getDisputeSnapshot = (booking, openerUser, opposingUser, openedBy) => {
  const serviceName = getBookingServiceName(booking);
  const openedByName = getUserDisplayName(openerUser);
  const againstName = getUserDisplayName(opposingUser);

  return {
    serviceName,
    openedByName,
    againstName,
    openedBy,
  };
};

/* ================= CREATE DISPUTE ================= */

const createDispute = async ({ jobId, category, description }, user) => {
  if (!jobId) throw new Error("Job ID is required");
  if (!category) throw new Error("Category is required");
  if (!description || !description.trim()) {
    throw new Error("Description is required");
  }

  const booking = await Booking.findById(jobId)
    .populate("customer", "name fullName email role basicInfo")
    .populate({
      path: "provider",
      populate: {
        path: "user",
        select: "name fullName email role basicInfo",
      },
    });

  if (!booking) throw new Error("Booking not found");

  const providerUserId = getProviderUserId(booking.provider);
  const customerId = toStringId(booking.customer);
  const currentUserId = toStringId(user?._id);

  const isCustomer = customerId === currentUserId;
  const isProvider = providerUserId === currentUserId;

  if (!isCustomer && !isProvider) {
    throw new Error("You are not part of this booking");
  }

  const existing = await Dispute.findOne({
    jobId,
    status: { $in: ACTIVE_DISPUTE_STATUSES },
  }).sort({ createdAt: -1 });

  if (existing) {
    await syncBookingDispute(jobId, existing);
    return existing;
  }

  const against = isCustomer ? providerUserId : customerId;
  if (!against) {
    throw new Error("Cannot determine opposing party");
  }

  const openedByUser = user;
  const againstUser = isCustomer
    ? booking.provider?.user || booking.provider
    : booking.customer;

  const { serviceName, openedByName, againstName } = getDisputeSnapshot(
    booking,
    openedByUser,
    againstUser,
    user._id
  );

  const dispute = await Dispute.create({
    jobId,
    openedBy: user._id,
    against,
    category,
    description: description.trim(),
    serviceName,
    openedByName,
    againstName,
    status: "open",
  });

  await DisputeMessage.create({
    disputeId: dispute._id,
    senderId: user._id,
    message: `Dispute opened: ${category}. ${description.trim()}`,
    attachments: [],
    messageType: "system",
    isSystemMessage: true,
  });

  await syncBookingDispute(jobId, dispute);

  return dispute;
};

/* ================= GET DISPUTE ================= */

const getDisputeById = async (disputeId, user) => {
  const dispute = await Dispute.findById(disputeId)
    .populate({
      path: "jobId",
      populate: [
        {
          path: "provider",
          populate: {
            path: "user",
            select: "name fullName email role basicInfo",
          },
        },
        {
          path: "customer",
          select: "name fullName email role basicInfo",
        },
      ],
    })
    .populate("openedBy", "name fullName email role basicInfo")
    .populate("against", "name fullName email role basicInfo");

  if (!dispute) throw new Error("Dispute not found");

  assertUserIsDisputeParticipant(dispute, user);

  const messages = await DisputeMessage.find({ disputeId: dispute._id })
    .populate("senderId", "name fullName email role basicInfo")
    .sort({ createdAt: 1 });

  const evidence = await DisputeEvidence.find({ disputeId: dispute._id })
    .populate("uploadedBy", "name fullName email role basicInfo")
    .sort({ createdAt: 1 });

  return {
    dispute,
    messages: messages.map((m) => normalizeMessage(m, user?._id)),
    evidence,
  };
};

/* ================= ADD MESSAGE ================= */

const addMessage = async (
  { disputeId, senderId, message, attachments = [] },
  user
) => {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) throw new Error("Dispute not found");

  assertUserIsDisputeParticipant(dispute, user);

  if (!message || !message.trim()) {
    throw new Error("Message is required");
  }

  const msg = await DisputeMessage.create({
    disputeId,
    senderId: senderId || user._id,
    message: message.trim(),
    attachments,
    messageType: user.role === "admin" ? "admin" : "user",
    isSystemMessage: false,
  });

  if (dispute.status === "open") {
    dispute.status = "responded";
    await dispute.save();
    await syncBookingDispute(dispute.jobId, dispute);
  }

  const populated = await DisputeMessage.findById(msg._id).populate(
    "senderId",
    "name fullName email role basicInfo"
  );

  return normalizeMessage(populated, user?._id);
};

/* ================= ADD EVIDENCE ================= */

const addEvidence = async ({ disputeId, uploadedBy, files }, user) => {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) throw new Error("Dispute not found");

  assertUserIsDisputeParticipant(dispute, user);

  if (!files?.length) {
    throw new Error("No files uploaded");
  }

  const uploads = await Promise.all(
    files.map(async (file) => {
      const result = await uploadBuffer(file.buffer, "disputes/evidence");

      const mime = file.mimetype || "";

      const evidenceType = mime.startsWith("image/")
        ? "image"
        : mime.startsWith("video/")
        ? "video"
        : mime === "application/pdf" || mime === "text/plain"
        ? "document"
        : "other";

      return {
        fileUrl: result.secure_url,
        publicId: result.public_id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        evidenceType,
        fileSize: file.size || 0,
      };
    })
  );

  const docs = await DisputeEvidence.insertMany(
    uploads.map((file) => ({
      disputeId,
      uploadedBy: uploadedBy || user._id,
      ...file,
    }))
  );

  if (["open", "responded"].includes(dispute.status)) {
    dispute.status = "under_review";
    await dispute.save();
    await syncBookingDispute(dispute.jobId, dispute);
  }

  return docs;
};

/* ================= RESOLVE DISPUTE ================= */

const resolveDispute = async ({ disputeId, resolvedBy, outcome, note }) => {
  const allowedOutcomes = ["customer_favored", "provider_favored", "neutral"];

  if (!allowedOutcomes.includes(outcome)) {
    throw new Error("Invalid outcome");
  }

  const dispute = await Dispute.findById(disputeId);
  if (!dispute) throw new Error("Dispute not found");

  if (resolvedBy?.role !== "admin") {
    throw new Error("Only admins can resolve disputes.");
  }

  if (["resolved", "closed"].includes(dispute.status)) {
    throw new Error("Dispute already finished");
  }

  dispute.status = "resolved";
  dispute.resolution = {
    outcome,
    note: note || "",
    resolvedBy,
    resolvedAt: new Date(),
  };
  dispute.closedAt = new Date();
  await dispute.save();

  await syncBookingDispute(dispute.jobId, dispute);

  const booking = await Booking.findById(dispute.jobId);
  if (!booking) return dispute;

  const customerId = toStringId(booking.customer);
  const providerUserId = getProviderUserId(booking.provider);

  const customer = customerId ? await User.findById(customerId) : null;
  const provider = providerUserId ? await User.findById(providerUserId) : null;

  const updateStats = async (userDoc, lostCondition) => {
    if (!userDoc) return;

    userDoc.disputeCount = (userDoc.disputeCount || 0) + 1;

    if (lostCondition) {
      userDoc.disputesLost = (userDoc.disputesLost || 0) + 1;
    }

    userDoc.disputeRatio =
      userDoc.disputeCount > 0 ? userDoc.disputesLost / userDoc.disputeCount : 0;

    if (userDoc.disputeCount >= 5 && userDoc.disputeRatio > 0.5) {
      userDoc.isSuspended = true;
    }

    await userDoc.save();
  };

  await updateStats(customer, outcome === "provider_favored");
  await updateStats(provider, outcome === "customer_favored");

  return dispute;
};

/* ================= CLOSE DISPUTE ================= */

const closeDispute = async ({ disputeId, user }) => {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) throw new Error("Dispute not found");

  assertUserCanCloseDispute(user);

  if (["resolved", "closed"].includes(dispute.status)) {
    return dispute;
  }

  dispute.status = "closed";
  dispute.closedAt = new Date();
  await dispute.save();

  await syncBookingDispute(dispute.jobId, dispute);

  return dispute;
};

/* ================= DELETE EVIDENCE ================= */

const deleteEvidence = async ({ evidenceId, user }) => {
  const evidence = await DisputeEvidence.findById(evidenceId);
  if (!evidence) throw new Error("Evidence not found");

  const dispute = await Dispute.findById(evidence.disputeId);
  if (!dispute) throw new Error("Dispute not found");

  assertUserIsDisputeParticipant(dispute, user);

  await deleteCloudinaryFile(evidence.publicId, "auto");
  await evidence.deleteOne();

  return true;
};

/* ================= EXPORTS ================= */

export {
  createDispute,
  getDisputeById,
  addMessage,
  addEvidence,
  resolveDispute,
  closeDispute,
  deleteEvidence,
};
