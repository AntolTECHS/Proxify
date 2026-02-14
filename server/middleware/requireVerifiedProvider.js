module.exports = (req, res, next) => {
  if (req.user.role !== "provider") {
    return res.status(403).json({ message: "Provider access only" });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      message: "Provider account not verified",
      status: req.user.verificationStatus,
    });
  }

  next();
};
