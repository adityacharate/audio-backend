require("dotenv").config();
const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Create "uploads" and "compressed" folders if they don't exist
const UPLOADS_DIR = path.join(__dirname, "uploads");
const COMPRESSED_DIR = path.join(__dirname, "compressed");

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(COMPRESSED_DIR)) fs.mkdirSync(COMPRESSED_DIR);

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Upload and compress audio
app.post("/upload", upload.single("audio"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded.");

  const inputPath = req.file.path;
  const outputPath = path.join(COMPRESSED_DIR, req.file.filename + ".mp3");

  // Compress audio using FFmpeg
  ffmpeg(inputPath)
    .audioCodec("libmp3lame")
    .audioBitrate("128k") // Adjust bitrate for compression
    .on("end", () => {
      fs.unlinkSync(inputPath); // Remove original file after compression
      res.json({ message: "File uploaded & compressed!", file: req.file.filename + ".mp3" });
    })
    .on("error", (err) => res.status(500).json({ error: err.message }))
    .save(outputPath);
});

// Stream audio in chunks
app.get("/stream/:filename", (req, res) => {
  const filePath = path.join(COMPRESSED_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send("File not found");

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const fileStream = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "audio/mp3",
    });
    fileStream.pipe(res);
  } else {
    res.writeHead(200, { "Content-Type": "audio/mp3", "Content-Length": fileSize });
    fs.createReadStream(filePath).pipe(res);
  }
});

// List all compressed audio files
app.get("/files", (req, res) => {
  fs.readdir(COMPRESSED_DIR, (err, files) => {
    if (err) return res.status(500).send("Error reading files");
    res.json(files);
  });
});

// Start the server
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
