const bcrypt = require("bcrypt");
const db = require("../db");

const findByEmail = async (email) => {
  const [rows] = await db.promise().query(
    "SELECT id, isEmailVerified, emailVerificationExpires FROM users WHERE email = ?",
    [email]
  );

  return rows[0] || null;
};

const findLoginUserByEmail = async (email) => {
  const [rows] = await db.promise().query(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );

  return rows[0] || null;
};

const findByValidResetToken = async (id, resetToken) => {
  const [rows] = await db.promise().query(
    "SELECT password FROM users WHERE id = ? AND resetToken = ? AND resetExpires > NOW()",
    [id, resetToken]
  );

  return rows[0] || null;
};

const findByValidEmailVerificationToken = async (emailVerificationToken) => {
  const [rows] = await db.promise().query(
    "SELECT id FROM users WHERE emailVerificationToken = ? AND emailVerificationExpires > NOW()",
    [emailVerificationToken]
  );

  return rows[0] || null;
};

const findByPhone = async (phone) => {
  const [rows] = await db.promise().query(
    "SELECT id FROM users WHERE phone = ?",
    [phone]
  );

  return rows[0] || null;
};

const createUser = async ({
  fullName,
  phone,
  email,
  password,
  gender,
  emailVerificationToken,
}) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  const [result] = await db.promise().query(
    `INSERT INTO users
      (fullName, phone, email, password, gender, isEmailVerified, emailVerificationToken, emailVerificationExpires)
     VALUES (?, ?, ?, ?, ?, FALSE, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
    [fullName, phone, email, hashedPassword, gender, emailVerificationToken]
  );

  return result.insertId;
};

const saveResetToken = async (id, resetToken) => {
  await db.promise().query(
    "UPDATE users SET resetToken = ?, resetExpires = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?",
    [resetToken, id]
  );
};

const saveEmailVerificationToken = async (id, emailVerificationToken) => {
  await db.promise().query(
    "UPDATE users SET emailVerificationToken = ?, emailVerificationExpires = DATE_ADD(NOW(), INTERVAL 24 HOUR) WHERE id = ?",
    [emailVerificationToken, id]
  );
};

const deleteExpiredUnverifiedUsers = async () => {
  const [result] = await db.promise().query(
    "DELETE FROM users WHERE isEmailVerified = FALSE AND emailVerificationExpires IS NOT NULL AND emailVerificationExpires < NOW()"
  );

  return result.affectedRows || 0;
};

const deleteExpiredUnverifiedUserByEmail = async (email) => {
  await db.promise().query(
    "DELETE FROM users WHERE email = ? AND isEmailVerified = FALSE AND emailVerificationExpires IS NOT NULL AND emailVerificationExpires < NOW()",
    [email]
  );
};

const updateFailedLogin = async (id, failedLoginAttempts, lockUntil = null) => {
  await db.promise().query(
    "UPDATE users SET failedLoginAttempts = ?, lockUntil = ? WHERE id = ?",
    [failedLoginAttempts, lockUntil, id]
  );
};

const updatePasswordAndClearResetToken = async (id, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  await db.promise().query(
    "UPDATE users SET password = ?, resetToken = NULL, resetExpires = NULL, failedLoginAttempts = 0, lockUntil = NULL WHERE id = ?",
    [hashedPassword, id]
  );
};

const resetFailedLogin = async (id) => {
  await db.promise().query(
    "UPDATE users SET failedLoginAttempts = 0, lockUntil = NULL WHERE id = ?",
    [id]
  );
};

const verifyEmail = async (id) => {
  await db.promise().query(
    "UPDATE users SET isEmailVerified = TRUE, emailVerificationToken = NULL, emailVerificationExpires = NULL WHERE id = ?",
    [id]
  );
};

module.exports = {
  deleteExpiredUnverifiedUserByEmail,
  deleteExpiredUnverifiedUsers,
  findByEmail,
  findByValidEmailVerificationToken,
  findByValidResetToken,
  findLoginUserByEmail,
  findByPhone,
  createUser,
  resetFailedLogin,
  saveEmailVerificationToken,
  saveResetToken,
  updateFailedLogin,
  updatePasswordAndClearResetToken,
  verifyEmail,
};
