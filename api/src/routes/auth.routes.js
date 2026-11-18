const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { saveUploadedImage } = require("../utils/saveUploadedImage");
const rateLimit = require("../middleware/rateLimit");
const { issueEmailOtp, verifyEmailOtp } = require("../utils/emailOtp");

const sessionDurationMs = 12 * 60 * 60 * 1000;
const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge: sessionDurationMs,
};
const dummyPasswordHash = bcrypt.hashSync(randomUUID(), 12);
const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) =>
    `login-ip:${req.ip || req.socket.remoteAddress || "unknown"}`,
});
const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyGenerator: (req) =>
    `login-account:${req.ip || req.socket.remoteAddress || "unknown"}:${String(
      req.body?.email || "",
    )
      .trim()
      .toLowerCase()}`,
});

function issueSession(user, res) {
  const token = jwt.sign(
    { id: user.id, token_version: Number(user.token_version || 0) },
    process.env.JWT_SECRET,
    { expiresIn: "12h", algorithm: "HS256" },
  );
  res.cookie("ie_session", token, sessionCookieOptions);
}

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 6,
  keyGenerator: (req) =>
    `register:${req.ip || req.socket.remoteAddress || "unknown"}`,
});
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) =>
    `otp-verify:${req.ip || req.socket.remoteAddress || "unknown"}`,
});
const otpResendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyGenerator: (req) =>
    `otp-resend:${req.ip || req.socket.remoteAddress || "unknown"}`,
});

router.post(
  "/register",
  registerLimiter,
  asyncHandler(async (req, res) => {
    const { name, email, password, phone, avatar_mime_type, avatar_data } =
      req.body || {};
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 120 ||
      typeof email !== "string" ||
      email.length > 190 ||
      !/^\S+@\S+\.\S+$/.test(email.trim()) ||
      typeof password !== "string" ||
      password.length < 8 ||
      Buffer.byteLength(password) > 72 ||
      (phone != null && (typeof phone !== "string" || phone.length > 30)) ||
      (avatar_mime_type == null) !== (avatar_data == null)
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Enter a name, valid email and a password of 8–72 bytes",
        });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const [exists] = await pool.query(
      "SELECT id,name,email,email_verified_at AS emailVerifiedAt,status,avatar_url FROM users WHERE email=? LIMIT 1",
      [normalizedEmail],
    );
    const hash = await bcrypt.hash(password, 12);
    if (exists.length) {
      const pendingUser = exists[0];
      if (pendingUser.emailVerifiedAt || pendingUser.status !== "pending")
        return res
          .status(409)
          .json({ success: false, message: "Email already registered" });
      let pendingAvatar = pendingUser.avatar_url;
      if (avatar_data != null) {
        const filename = await saveUploadedImage(avatar_mime_type, avatar_data);
        pendingAvatar = `${req.protocol}://${req.get("host")}/api/uploads/${filename}`;
      }
      await pool.execute(
        "UPDATE users SET name=?,phone=?,password_hash=?,avatar_url=? WHERE id=? AND status='pending'",
        [name.trim(), phone || null, hash, pendingAvatar, pendingUser.id],
      );
      await issueEmailOtp({
        userId: pendingUser.id,
        email: pendingUser.email,
        name: name.trim(),
        purpose: "register",
      });
      return res.json({
        success: true,
        requiresOtp: true,
        email: pendingUser.email,
      });
    }

    const id = randomUUID();
    let avatarUrl = null;
    if (avatar_data != null) {
      const filename = await saveUploadedImage(avatar_mime_type, avatar_data);
      avatarUrl = `${req.protocol}://${req.get("host")}/api/uploads/${filename}`;
    }
    await pool.query(
      "INSERT INTO users(id,name,email,phone,password_hash,role,status,avatar_url) VALUES(?,?,?,?,?,'reader','pending',?)",
      [id, name.trim(), normalizedEmail, phone || null, hash, avatarUrl],
    );
    await issueEmailOtp({
      userId: id,
      email: normalizedEmail,
      name: name.trim(),
      purpose: "register",
    });
    res
      .status(201)
      .json({ success: true, requiresOtp: true, email: normalizedEmail });
  }),
);

router.post(
  "/login",
  loginIpLimiter,
  loginAccountLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.length > 190 ||
      Buffer.byteLength(password) > 72
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }
    const [rows] = await pool.query(
      "SELECT id,name,email,password_hash,role,status,avatar_url,token_version FROM users WHERE email=? LIMIT 1",
      [email.trim().toLowerCase()],
    );
    const user = rows[0];
    const passwordMatches = await bcrypt.compare(
      password,
      user?.password_hash || dummyPasswordHash,
    );
    if (!user || !passwordMatches)
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    if (user.status === "pending")
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Verify your email to finish creating your account. Use the registration page to resend the code.",
        });
    if (user.status !== "active")
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    await issueEmailOtp({
      userId: user.id,
      email: user.email,
      name: user.name,
      purpose: "login",
    });
    res.json({ success: true, requiresOtp: true, email: user.email });
  }),
);

router.post(
  "/otp/resend",
  otpResendLimiter,
  asyncHandler(async (req, res) => {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const purpose = req.body?.purpose;
    if (
      !/^\S+@\S+\.\S+$/.test(email) ||
      !["register", "login"].includes(purpose)
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Enter a valid email and verification type.",
        });
    }
    const [rows] = await pool.query(
      "SELECT id,name,email,status,email_verified_at AS emailVerifiedAt FROM users WHERE email=? LIMIT 1",
      [email],
    );
    const user = rows[0];
    const eligible =
      user &&
      (purpose === "register"
        ? user.status === "pending" && !user.emailVerifiedAt
        : user.status === "active");
    if (eligible)
      await issueEmailOtp({
        userId: user.id,
        email: user.email,
        name: user.name,
        purpose,
      });
    res.json({
      success: true,
      requiresOtp: true,
      email,
      message: "If the account is eligible, a new code has been sent.",
    });
  }),
);

router.post(
  "/verify-otp",
  otpVerifyLimiter,
  asyncHandler(async (req, res) => {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    const purpose = req.body?.purpose;
    if (
      !/^\S+@\S+\.\S+$/.test(email) ||
      !/^\d{6}$/.test(code) ||
      !["register", "login"].includes(purpose)
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Enter the six-digit code sent to your email.",
        });
    }
    const [rows] = await pool.query(
      "SELECT id,name,email,phone,role,status,avatar_url,token_version,email_verified_at AS emailVerifiedAt FROM users WHERE email=? LIMIT 1",
      [email],
    );
    const user = rows[0];
    const eligible =
      user &&
      (purpose === "register"
        ? user.status === "pending" && !user.emailVerifiedAt
        : user.status === "active");
    if (!eligible)
      return res
        .status(400)
        .json({
          success: false,
          message:
            "This verification request is no longer valid. Sign in or register again.",
        });

    await verifyEmailOtp({ userId: user.id, purpose, code });
    if (purpose === "register") {
      await pool.execute(
        "UPDATE users SET status='active',email_verified_at=UTC_TIMESTAMP() WHERE id=? AND status='pending'",
        [user.id],
      );
      user.status = "active";
    } else {
      await pool.execute(
        "UPDATE users SET email_verified_at=COALESCE(email_verified_at,UTC_TIMESTAMP()) WHERE id=?",
        [user.id],
      );
    }
    issueSession(user, res);
    delete user.token_version;
    delete user.status;
    delete user.emailVerifiedAt;
    res.json({ success: true, user });
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT id,name,email,phone,role,avatar_url,bio,created_at FROM users WHERE id=?",
      [req.user.id],
    );
    res.json({ success: true, data: rows[0] });
  }),
);

router.patch(
  "/me/avatar",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { mimeType, data } = req.body || {};
    const filename = await saveUploadedImage(mimeType, data);
    const avatarUrl = `${req.protocol}://${req.get("host")}/api/uploads/${filename}`;
    await pool.query("UPDATE users SET avatar_url=? WHERE id=?", [
      avatarUrl,
      req.user.id,
    ]);
    res.json({ success: true, data: { avatar_url: avatarUrl } });
  }),
);

router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    await pool.query(
      "UPDATE users SET token_version=token_version+1 WHERE id=?",
      [req.user.id],
    );
    res.clearCookie("ie_session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    res.json({ success: true });
  }),
);

module.exports = router;
