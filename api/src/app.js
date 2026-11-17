const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const rateLimit = require("./middleware/rateLimit");
const app = express();

app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = (
  process.env.WEB_ORIGIN ||
  process.env.CORS_ORIGIN ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173,http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
const uploadDirectory = path.join(__dirname, "../uploads");
const uploadStaticOptions = {
  maxAge: "1y",
  immutable: true,
  setHeaders(res) {
    res.setHeader("X-Content-Type-Options", "nosniff");
  },
};
app.use("/uploads", express.static(uploadDirectory, uploadStaticOptions));
app.use("/api/uploads", express.static(uploadDirectory, uploadStaticOptions));
app.use("/api", rateLimit({ windowMs: 60000, max: 240 }));

app.get("/api/health", (_req, res) =>
  res.json({ success: true, name: "Islami Express API" }),
);
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/articles", require("./routes/articles.routes"));
app.use("/api/interactions", require("./routes/interactions.routes"));
app.use("/api/comments", require("./routes/comments.routes"));
app.use("/api/public", require("./routes/public.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/admin/uploads", require("./routes/uploads.routes"));

app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found" }),
);
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res
    .status(status)
    .json({
      success: false,
      message:
        process.env.NODE_ENV === "production" && status >= 500
          ? "Internal server error"
          : err.message,
    });
});
module.exports = app;
