const nodemailer = require("nodemailer");
const {
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} = require("crypto");
const pool = require("../config/db");

const OTP_LIFETIME_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function otpDigest(userId, purpose, code) {
  return createHmac("sha256", process.env.JWT_SECRET)
    .update(`${userId}:${purpose}:${code}`)
    .digest("hex");
}

function createMailer() {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM;
  if (!host || !Number.isInteger(port) || !user || !pass || !from) {
    const error = new Error(
      "Email delivery is not configured. Contact the site administrator.",
    );
    error.status = 503;
    throw error;
  }
  return {
    from,
    transport: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
  };
}

async function issueEmailOtp({ userId, email, name, purpose }) {
  const [existing] = await pool.query(
    "SELECT TIMESTAMPDIFF(SECOND,created_at,UTC_TIMESTAMP()) AS ageSeconds FROM auth_email_otps WHERE user_id=? AND purpose=? LIMIT 1",
    [userId, purpose],
  );
  if (existing[0] && Number(existing[0].ageSeconds) < 60) {
    const error = new Error(
      "A code was sent recently. Check your email or wait one minute before requesting another.",
    );
    error.status = 429;
    throw error;
  }

  const { transport, from } = createMailer();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const digest = otpDigest(userId, purpose, code);
  await pool.execute(
    `INSERT INTO auth_email_otps (id,user_id,purpose,code_hash,expires_at,attempts,created_at)
     VALUES (?,?,?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${OTP_LIFETIME_MINUTES} MINUTE),0,UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE id=VALUES(id),code_hash=VALUES(code_hash),expires_at=VALUES(expires_at),attempts=0,created_at=UTC_TIMESTAMP()`,
    [randomUUID(), userId, purpose, digest],
  );

  try {
    await transport.sendMail({
      from,
      to: email,
      subject:
        purpose === "register"
          ? "Verify your Islami Express account"
          : "Your Islami Express login code",
      text: `Hello ${name},\n\nYour verification code is ${code}. It expires in ${OTP_LIFETIME_MINUTES} minutes. If you did not request this code, you can ignore this email.\n\nIslami Express`,
      html: `<p>Hello ${escapeHtml(name)},</p><p>Your verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in ${OTP_LIFETIME_MINUTES} minutes. If you did not request it, you can ignore this email.</p><p>Islami Express</p>`,
    });
  } catch (smtpError) {
    // Keep provider diagnostics on the server only; never return SMTP details to clients.
    console.error("OTP email delivery failed", {
      code: smtpError.code,
      command: smtpError.command,
      responseCode: smtpError.responseCode,
      response: smtpError.response,
      message: smtpError.message,
    });
    await pool
      .execute(
        "DELETE FROM auth_email_otps WHERE user_id=? AND purpose=? AND code_hash=?",
        [userId, purpose, digest],
      )
      .catch(() => {});
    const error = new Error(
      "We could not send the verification email. Check your email address or try again shortly.",
    );
    error.status = 503;
    throw error;
  } finally {
    transport.close();
  }
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

async function verifyEmailOtp({ userId, purpose, code }) {
  const [rows] = await pool.query(
    `SELECT code_hash AS codeHash,attempts,expires_at > UTC_TIMESTAMP() AS isValid
     FROM auth_email_otps WHERE user_id=? AND purpose=? LIMIT 1`,
    [userId, purpose],
  );
  const challenge = rows[0];
  if (!challenge || !Number(challenge.isValid)) {
    await pool.execute(
      "DELETE FROM auth_email_otps WHERE user_id=? AND purpose=?",
      [userId, purpose],
    );
    const error = new Error(
      "That code has expired. Request a new one and try again.",
    );
    error.status = 400;
    throw error;
  }

  const expected = Buffer.from(challenge.codeHash, "hex");
  const submitted = Buffer.from(otpDigest(userId, purpose, code), "hex");
  if (
    expected.length !== submitted.length ||
    !timingSafeEqual(expected, submitted)
  ) {
    const attempts = Number(challenge.attempts) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await pool.execute(
        "DELETE FROM auth_email_otps WHERE user_id=? AND purpose=?",
        [userId, purpose],
      );
      const error = new Error(
        "Too many incorrect codes. Request a new verification code.",
      );
      error.status = 429;
      throw error;
    }
    await pool.execute(
      "UPDATE auth_email_otps SET attempts=? WHERE user_id=? AND purpose=?",
      [attempts, userId, purpose],
    );
    const error = new Error(
      `Incorrect code. ${MAX_ATTEMPTS - attempts} attempts remaining.`,
    );
    error.status = 400;
    throw error;
  }
  const [consumed] = await pool.execute(
    "DELETE FROM auth_email_otps WHERE user_id=? AND purpose=? AND code_hash=?",
    [userId, purpose, challenge.codeHash],
  );
  if (!consumed.affectedRows) {
    const error = new Error(
      "This code has already been used. Request a new one if needed.",
    );
    error.status = 400;
    throw error;
  }
}

module.exports = { issueEmailOtp, verifyEmailOtp };
