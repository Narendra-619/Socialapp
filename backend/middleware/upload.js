import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    if (file.mimetype.startsWith("video/")) {
      return {
        folder: "social_app/videos",
        resource_type: "video",
        allowed_formats: ["mp4", "webm", "quicktime"],
      };
    }
    return {
      folder: "social_app",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
      transformation: [{ width: 1200, crop: "limit" }],
    };
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images and videos are allowed."), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB
  } 
});

const extractPublicId = (url) => {
  try {
    const match = url.match(/\/upload\/(?:[^\/]+\/)*v\d+\/(.+?)(?:\.[^.]+)?$/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
};

export { cloudinary, upload, extractPublicId };
