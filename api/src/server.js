const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, process.env.ENV_FILE || "../.env"),
});

if (
  !process.env.JWT_SECRET ||
  process.env.JWT_SECRET.length < 32 ||
  new Set(process.env.JWT_SECRET).size < 8 ||
  /^(.{1,8})\1+$/.test(process.env.JWT_SECRET)
) {
  throw new Error(
    "Set JWT_SECRET to a persistent random value with at least 32 characters before starting the API.",
  );
}

const app = require("./app");
const pool = require("./config/db");
const port = Number(process.env.PORT || 8000);
const requiredTables = [
  "users",
  "auth_email_otps",
  "categories",
  "articles",
  "article_revisions",
  "article_views",
  "article_likes",
  "saved_articles",
  "article_shares",
  "comments",
  "comment_likes",
  "comment_reports",
  "epapers",
  "ad_positions",
  "advertisements",
  "ad_events",
  "newsletter_subscribers",
];

(async () => {
  try {
    await pool.query("SELECT 1");
    const [tableRows] = await pool.query("SHOW TABLES");
    const existingTables = new Set(tableRows.map((row) => Object.values(row)[0]));
    const missingTables = requiredTables.filter((table) => !existingTables.has(table));
    if (missingTables.length) {
      throw new Error(
        `Database schema is incomplete. Missing tables: ${missingTables.join(", ")}. Import api/schema.sql or apply the matching api/migrations SQL, then restart the API.`,
      );
    }

    const [[tokenVersionColumn]] = await pool.query(
      "SELECT COUNT(*) AS column_count FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' AND column_name='token_version'",
    );
    if (!Number(tokenVersionColumn.column_count)) {
      await pool.query("ALTER TABLE users ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 0");
    }

    console.log("✅ MySQL connected");

    app.listen(port, () => {
      console.log(`🚀 Islami Express API running on http://localhost:${port}`);
    });

    setInterval(async () => {
      try {
        await pool.query(
          "UPDATE articles SET status='published',published_at=COALESCE(published_at,NOW()) WHERE status='scheduled' AND scheduled_at<=NOW()",
        );
      } catch (error) {
        console.error("Scheduler:", error.message);
      }
    }, 60000).unref();
  } catch (error) {
    console.error("❌ API startup failed:", error.message);
    process.exit(1);
  }
})();
