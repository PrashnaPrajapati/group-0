const db = require("../db");

const findReviewTexts = async () => {
  const [rows] = await db.promise().query(
    "SELECT feedback_text FROM feedback WHERE feedback_text IS NOT NULL AND TRIM(feedback_text) <> ''"
  );

  return rows;
};

const countSentimentDetails = async ({ search, whereClause, params }) => {
  const [rows] = await db.promise().query(
    `SELECT COUNT(*) AS total FROM feedback f LEFT JOIN users u ON f.user_id = u.id ${whereClause}`,
    params
  );

  return rows[0]?.total || 0;
};

const findSentimentDetails = async ({ whereClause, params, limit, offset }) => {
  const [rows] = await db.promise().query(
    `SELECT f.id, f.booking_id, f.user_id, u.fullname AS customer, f.feedback_text AS review, f.rating, f.created_at
     FROM feedback f
     LEFT JOIN users u ON f.user_id = u.id
     ${whereClause}
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
