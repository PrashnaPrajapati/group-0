const db = require("../db");

const findById = async (id) => {
  const [rows] = await db.promise().query(
    `SELECT
      id,
      fullName,
      email,
      phone,
      gender,
      address,
      photoUrl,
      created_at,
      role,
      isEmailVerified,
      (password IS NOT NULL AND password <> '') AS hasPassword
     FROM users
     WHERE id = ?`,
    [id]
  );

  return rows[0] || null;
};

const updateProfile = async ({ id, fullName, phone, address }) => {
  const [result] = await db.promise().query(
    "UPDATE users SET fullName=?, phone=?, address=? WHERE id=?",
    [fullName, phone, address || null, id]
  );

  return result.affectedRows;
};

const findPasswordById = async (id) => {
  const [rows] = await db.promise().query("SELECT password FROM users WHERE id=?", [id]);
  return rows[0] || null;
};

const updatePassword = async (id, hashedPassword) => {
  const [result] = await db.promise().query(
    "UPDATE users SET password=? WHERE id=?",
    [hashedPassword, id]
  );

  return result.affectedRows;
};

const updatePhoto = async (id, photoUrl) => {
  const [result] = await db.promise().query(
    "UPDATE users SET photoUrl=? WHERE id=?",
    [photoUrl, id]
  );

  return result.affectedRows;
};

const removePhoto = async (id) => {
  const [result] = await db.promise().query(
    "UPDATE users SET photoUrl=NULL WHERE id=?",
    [id]
  );

  return result.affectedRows;
};

module.exports = {
  findById,
  findPasswordById,
  removePhoto,
  updatePassword,
  updatePhoto,
  updateProfile,
};
