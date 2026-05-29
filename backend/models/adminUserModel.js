const db = require("../db");

const findAllUsers = async () => {
  const [rows] = await db.promise().query(
    `SELECT
      id,
      fullName,
      phone,
      email,
      gender,
      created_at,
      role,
      blocked,
      blockedReason,
      isEmailVerified,
      failedLoginAttempts,
      lockUntil
    FROM users
    ORDER BY created_at DESC, id DESC`
  );

  return rows;
};

const updateRole = async (id, role) => {
  const [result] = await db.promise().query(
    "UPDATE users SET role = ? WHERE id = ?",
    [role, id]
  );

  return result.affectedRows;
};

const blockUser = async (id, reason) => {
  const [result] = await db.promise().query(
    "UPDATE users SET blocked = TRUE, blockedReason = ? WHERE id = ?",
    [reason, id]
  );

  return result.affectedRows;
};

const unblockUser = async (id) => {
  const [result] = await db.promise().query(
    "UPDATE users SET blocked = FALSE, blockedReason = NULL WHERE id = ?",
    [id]
  );

  return result.affectedRows;
};

const findRoleById = async (id) => {
  const [rows] = await db.promise().query("SELECT role FROM users WHERE id = ?", [id]);
  return rows[0] || null;
};

const deleteUser = async (id) => {
  const [result] = await db.promise().query("DELETE FROM users WHERE id = ?", [id]);
  return result.affectedRows;
};

module.exports = {
  blockUser,
  deleteUser,
  findAllUsers,
  findRoleById,
  unblockUser,
  updateRole,
};
