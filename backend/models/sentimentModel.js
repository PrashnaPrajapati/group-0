const db = require("../db");

const buildSentimentFilter = (search = "") => {
  const where = ["f.feedback_text IS NOT NULL", "TRIM(f.feedback_text) <> ''"];
  const params = [];
  const trimmedSearch = String(search || "").trim();

  if (trimmedSearch) {
    where.push("(u.fullname LIKE ? OR f.feedback_text LIKE ?)");
    params.push(`%${trimmedSearch}%`, `%${trimmedSearch}%`);
  }

  return {
    clause: `WHERE ${where.join(" AND ")}`,
    params,
  };
};

const findReviewTexts = async () => {
  const [rows] = await db.promise().query(
    "SELECT feedback_text FROM feedback WHERE feedback_text IS NOT NULL AND TRIM(feedback_text) <> ''"
  );

  return rows;
};

const countSentimentDetails = async ({ search }) => {
  const { clause, params } = buildSentimentFilter(search);
  const [rows] = await db.promise().query(
    `SELECT COUNT(*) AS total FROM feedback f LEFT JOIN users u ON f.user_id = u.id ${clause}`,
    params
  );

  return rows[0]?.total || 0;
};

const findSentimentDetails = async ({ search, limit, offset }) => {
  const { clause, params } = buildSentimentFilter(search);
  const [rows] = await db.promise().query(
    `SELECT f.id, f.booking_id, f.user_id, u.fullname AS customer, f.feedback_text AS review, f.rating, f.created_at
     FROM feedback f
     LEFT JOIN users u ON f.user_id = u.id
     ${clause}
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return rows;
};

module.exports = {
  countSentimentDetails,
  findReviewTexts,
  findSentimentDetails,
};
