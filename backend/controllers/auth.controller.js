import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateTokenAndSetCookie } from "../lib/utils/generateToken.js";

export const signup = async (req, res) => {
  const { fullName, username, email, password } = req.body || {};
  // Debug: log received keys (not values) to help diagnose payload shape
  try {
    const keys = Object.keys(req.body || {});
    console.log("/signup method:", req.method);
    console.log("/signup content-type:", req.headers["content-type"]);
    console.log("/signup received keys:", keys);
  } catch {}
  // Basic required field validation to avoid destructuring undefined
  const missing = [
    !fullName && "fullName",
    !username && "username",
    !email && "email",
    !password && "password",
  ].filter(Boolean);
  if (missing.length) {
    return res.status(400).json({ error: "Missing required fields", missing });
  }
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: "Invalid email format",
    });
  }

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({
      error: "Username is already taken",
    });
  }
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    return res.status(400).json({
      error: "Email is already exist",
    });
  }
  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters long" });
  }
  //Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new User({
    fullName,
    email,
    username,
    password: hashedPassword,
  });

  if (newUser) {
    generateTokenAndSetCookie(newUser._id, res);
    await newUser.save();
    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      username: newUser.username,
      email: newUser.email,
      followers: newUser.followers,
      following: newUser.following,
      profileImg: newUser.profileImg,
      coverImg: newUser.coverImg,
    });
  } else {
    res.status(400).json({
      error: "Invalid user data",
    });
  }
};
export const login = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  const isPasswordCorrect = await bcrypt.compare(
    password,
    user?.password || ""
  );
  if (!user || !isPasswordCorrect) {
    return res.status(400).json({ error: "Invalid name or password" });
  }
  generateTokenAndSetCookie(user._id, res);
  res.status(200).json({
    _id: user._id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    followers: user.followers,
    following: user.following,
    profileImg: user.profileImg,
    coverImg: user.coverImg,
  });
};
export const logout = async (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully!" });
  } catch (error) {
    console.log("Error in loggout controller", error.message);
    res.status(5000).json({
      error: "Internal Server Error",
    });
  }
};
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.status(200).json(user);
  } catch (error) {
    console.log("Error in getMe controller", error.message);
    res.status(500).json({ error: "Internall Server Error" });
  }
};
