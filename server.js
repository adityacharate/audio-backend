const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

// Enable CORS for frontend communication
app.use(cors());

// Ensure 'uploads' folder exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure Multer to store files in "uploads/" and accept only .mp3 files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Save to "uploads/" directory
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Save with original filename
  },
});

const fileFilter = (req, file, cb) => {
  if (path.extname(file.originalname) === ".mp3") {
    cb(null, true); // Accept file
  } else {
    cb(new Error("Only .mp3 files are allowed!"), false); // Reject file
  }
};

const upload = multer({ storage, fileFilter });

// Route to handle file upload (Accepts ANY field name)
app.post("/upload", upload.any(), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded or invalid file type!" });
  }

  res.json({
    message: "File uploaded successfully!",
    file: req.files.map((file) => ({
      filename: file.originalname,
      path: `/uploads/${file.originalname}`,
    })),
  });
});

// Route to list uploaded files
app.get("/files", (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Unable to fetch files!" });
    }
    res.json({ files });
  });
});

// Serve uploaded files
app.use("/uploads", express.static(uploadDir));

// Default route
app.get("/", (req, res) => {
  res.send("🎵 Audio Backend is Running! Upload files via /upload 🎧");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
