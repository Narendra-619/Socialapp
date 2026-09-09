const ERROR_MAP = {
  "E11000 duplicate key error": "This information is already taken. Please try different one.",
  "ValidationError": "Please check your input and try again.",
  "CastError": "Invalid data format.",
  "MulterError": "File upload failed. Please try again.",
  "LIMIT_FILE_SIZE": "File is too large. Maximum size is 50MB.",
  "jwt malformed": "Session expired. Please log in again.",
  "jwt expired": "Session expired. Please log in again.",
  "invalid signature": "Session invalid. Please log in again.",
  "Password mismatch": "Incorrect password. Please try again.",
  "User not found": "Account not found.",
  "OTP expired": "Code has expired. Please request a new one.",
  "Invalid OTP": "Incorrect code. Please try again.",
  "Email already registered": "This email is already in use.",
  "Username already taken": "This username is already taken.",
};

const getFriendlyMessage = (err) => {
  const message = err.message || "";

  for (const [pattern, friendly] of Object.entries(ERROR_MAP)) {
    if (message.includes(pattern)) {
      return friendly;
    }
  }

  if (err.name === "MongoServerError" && err.code === 11000) {
    const keyPattern = Object.keys(err.keyPattern || {}).join(", ");
    if (keyPattern.includes("email")) return "This email is already registered.";
    if (keyPattern.includes("username")) return "This username is already taken.";
    return "This information is already taken.";
  }

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") return "File is too large. Maximum size is 50MB.";
    return "File upload failed. Please try again.";
  }

  return null;
};

export default function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${err.name}: ${err.message}`);

  const friendlyMessage = getFriendlyMessage(err);

  if (friendlyMessage) {
    return res.status(err.statusCode || 400).json({ error: friendlyMessage });
  }

  if (err.name === "MulterError" || err.message?.includes("file type")) {
    return res.status(400).json({ error: err.message });
  }

  res.status(err.statusCode || 500).json({ error: "Something went wrong. Please try again later." });
}
