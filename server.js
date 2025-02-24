const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create an "uploads" folder if it doesn't exist
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Save files in uploads directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Rename file with timestamp
  },
});

const upload = multer({ storage });

// 🎵 **Route to Upload Audio File**
app.post("/upload", upload.single("audio"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded!" });
  }

  const inputPath = req.file.path;
  const outputPath = `uploads/compressed_${req.file.filename}.mp3`;

  // Compress audio using FFmpeg
  ffmpeg(inputPath)
    .audioCodec("libmp3lame")
    .audioBitrate("128k") // Compress to 128kbps
    .save(outputPath)
    .on("end", () => {
      fs.unlinkSync(inputPath); // Delete original file
      res.json({ message: "File uploaded and compressed!", file: outputPath });
    })
    .on("error", (err) => {
      console.error("FFmpeg error:", err);
      res.status(500).json({ error: "Compression failed!" });
    });
});

// 🎵 **Route to Get All Songs**
app.get("/songs", (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Could not fetch songs" });
    }
    const audioFiles = files.filter((file) => file.endsWith(".mp3"));
    res.json(audioFiles);
  });
});

// 🎵 **Route to Serve Audio Files**
app.get("/songs/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "File not found!" });
  }
});

// Start server
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
