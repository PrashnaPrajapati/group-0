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

const findDeleteCandidateById = async (id) => {
  const [rows] = await db.promise().query(
    `SELECT
      id,
      role,
      isEmailVerified,
      created_at,
      TIMESTAMPDIFF(HOUR, created_at, NOW()) AS accountAgeHours
    FROM users
    WHERE id = ?`,
    [id]
  );

  return rows[0] || null;
};

const deleteStaleUnverifiedUser = async (id) => {
  const [result] = await db.promise().query(
    `DELETE FROM users
     WHERE id = ?
       AND role <> 'admin'
       AND isEmailVerified = FALSE
       AND created_at < DATE_SUB(NOW(), INTERVAL 48 HOUR)`,
    [id]
  );

  return result.affectedRows;
};

module.exports = {
  blockUser,
  deleteStaleUnverifiedUser,
  findAllUsers,
  findDeleteCandidateById,
  findRoleById,
  unblockUser,
  updateRole,
};
