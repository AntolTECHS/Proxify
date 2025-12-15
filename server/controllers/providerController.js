const ProviderProfile = require("../models/ProviderProfile");

// GET current provider profile
exports.getProfile = async (req, res) => {
  try {
    const profile = await ProviderProfile.findOne({ user: req.user.id }).populate("services");
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE provider profile
exports.updateProfile = async (req, res) => {
  try {
    const { bio, address, coordinates, profileImage } = req.body;

    let profile = await ProviderProfile.findOne({ user: req.user.id });
    if (!profile) {
      profile = new ProviderProfile({ user: req.user.id });
    }

    profile.bio = bio || profile.bio;
    profile.location = { address: address || profile.location?.address, coordinates: coordinates || profile.location?.coordinates };
    profile.profileImage = profileImage || profile.profileImage;

    await profile.save();
    res.json({ message: "Profile updated", profile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
