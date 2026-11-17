const { randomUUID } = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const uploadDirectory = path.join(__dirname, "../../uploads");
const maxBytes = 8 * 1024 * 1024;
const imageTypes = {
  "image/jpeg": { extension: "jpg", matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  "image/png": { extension: "png", matches: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  "image/webp": { extension: "webp", matches: (buffer) => buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" },
  "image/avif": { extension: "avif", matches: (buffer) => buffer.length >= 12 && (buffer.toString("ascii", 4, 12).startsWith("ftypavif") || buffer.toString("ascii", 4, 12).startsWith("ftypavis")) },
};

async function saveUploadedImage(mimeType, data) {
  const imageType = imageTypes[mimeType];
  if (!imageType || typeof data !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    const error = new Error("Choose a valid JPEG, PNG, WebP, or AVIF image.");
    error.status = 400;
    throw error;
  }

  const image = Buffer.from(data, "base64");
  if (!image.length || image.length > maxBytes) {
    const error = new Error("Images must be smaller than 8 MB.");
    error.status = 413;
    throw error;
  }
  if (!imageType.matches(image)) {
    const error = new Error("The selected file does not match its image type.");
    error.status = 400;
    throw error;
  }

  await fs.mkdir(uploadDirectory, { recursive: true });
  const filename = `${randomUUID()}.${imageType.extension}`;
  await fs.writeFile(path.join(uploadDirectory, filename), image, { flag: "wx" });
  return filename;
}

module.exports = { saveUploadedImage };
