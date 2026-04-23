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
    // Determine the format based on the mimetype
    let format = "jpg"; // default
    if (file.mimetype === "image/gif") format = "gif";
    if (file.mimetype === "image/png") format = "png";
    if (file.mimetype === "image/webp") format = "webp";
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/jpg") format = "jpg";

    return {
      folder: "social_app",
      format: format,
      // For GIFs, we use a different transformation to preserve animation
      transformation: format === "gif" 
        ? [{ width: 800, crop: "limit", fetch_format: "auto", quality: "auto" }]
        : [{ width: 1200, crop: "limit", fetch_format: "auto", quality: "auto" }],
    };
  },
});

const fileFilter = (req, file, cb) => {
  // Log file info for debugging
  console.log("Uploading file:", {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images (JPG, PNG, GIF, WebP) are allowed."), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB limit
  } 
});

const extractPublicId = (url) => {
  try {
    const splitUrl = url.split("/");
    const lastSegment = splitUrl[splitUrl.length - 1];
    const publicId = lastSegment.split(".")[0];
    return `social_app/${publicId}`;
  } catch (error) {
    return null;
  }
};

export { cloudinary, upload, extractPublicId };
