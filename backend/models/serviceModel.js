const db = require("../db");
const { buildSetClause } = require("../utils/sql");

const serviceFields = `
  s.id,
  s.name,
  s.description,
  s.price,
  s.duration,
  s.image,
  s.status,
  s.created_at,
  s.gender,
  s.category
`;

const serviceGroupBy = `
  s.id,
  s.name,
  s.description,
  s.price,
  s.duration,
  s.image,
  s.status,
  s.created_at,
  s.gender,
  s.category
`;

const findActiveServices = async () => {
  const [rows] = await db.promise().query(
    `SELECT ${serviceFields},
            IFNULL(ROUND(AVG(f.rating), 1), 0) AS rating,
            COUNT(DISTINCT b.id) AS booking_count
     FROM services s
     LEFT JOIN bookings b ON b.service_id = s.id
     LEFT JOIN feedback f ON f.booking_id = b.id
     WHERE s.status = 'active'
     GROUP BY ${serviceGroupBy}`
  );

  return rows;
};

const findActiveServiceById = async (id) => {
  const [rows] = await db.promise().query(
    `SELECT ${serviceFields},
            IFNULL(ROUND(AVG(f.rating), 1), 0) AS rating,
            COUNT(f.id) AS review_count
     FROM services s
     LEFT JOIN bookings b ON b.service_id = s.id
     LEFT JOIN feedback f ON f.booking_id = b.id
     WHERE s.id = ? AND s.status = 'active'
     GROUP BY ${serviceGroupBy}`,
    [id]
  );

  return rows[0] || null;
};

const findReviewsByServiceId = async (id) => {
  const [rows] = await db.promise().query(
    `SELECT u.fullname AS customer, f.rating, f.feedback_text AS review, f.created_at
     FROM feedback f
     JOIN users u ON f.user_id = u.id
     JOIN bookings b ON f.booking_id = b.id
     WHERE b.service_id = ?
     ORDER BY f.created_at DESC`,
    [id]
  );

  return rows;
};

const findByName = async (name) => {
  const [rows] = await db.promise().query(
    "SELECT id FROM services WHERE LOWER(name) = LOWER(?)",
    [name]
  );

  return rows[0] || null;
};

const findDuplicateName = async (name, excludedId) => {
  const [rows] = await db.promise().query(
    "SELECT id FROM services WHERE LOWER(name)=LOWER(?) AND id!=?",
    [name, excludedId]
  );

  return rows[0] || null;
};

const createService = async ({ name, description, price, duration, gender, category, image }) => {
  const [result] = await db.promise().query(
    "INSERT INTO services (name, description, price, duration, gender, category, image, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())",
    [name, description, price, duration, gender, category, image]
  );

  return result.insertId;
};

const findAll = async () => {
  const [rows] = await db.promise().query("SELECT * FROM services");
  return rows;
};

const updateService = async (id, { name, description, price, duration, gender, category, image }) => {
  const { clause, params } = buildSetClause(
    {
      name: "name",
      description: "description",
      price: "price",
      duration: "duration",
      gender: "gender",
      category: "category",
      image: "image",
    },
    {
      name,
      description,
      price,
      duration,
      gender,
      category,
      image: image || undefined,
    }
  );

  params.push(id);

  const [result] = await db.promise().query(
    `UPDATE services SET ${clause} WHERE id = ?`,
    params
  );

  return result.affectedRows;
};

const updateStatus = async (id, status) => {
  const [result] = await db.promise().query(
    "UPDATE services SET status = ? WHERE id = ?",
    [status, id]
  );

  return result.affectedRows;
};

module.exports = {
  createService,
  findActiveServiceById,
  findActiveServices,
  findAll,
  findByName,
  findDuplicateName,
  findReviewsByServiceId,
  updateService,
  updateStatus,
};
