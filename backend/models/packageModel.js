const db = require("../db");
const { buildSetClause } = require("../utils/sql");

const parseServices = (services) => {
  if (!services) return [];
  if (typeof services === "string") return JSON.parse(services).filter((service) => service && service.id);
  return services.filter((service) => service && service.id);
};

const findByName = async (name) => {
  const [rows] = await db.promise().query(
    "SELECT id FROM packages WHERE LOWER(name) = LOWER(?)",
    [name]
  );

  return rows[0] || null;
};

const createPackage = async ({ name, description, price, duration, status, image }) => {
  const [result] = await db.promise().query(
    "INSERT INTO packages (name, description, price, duration, status, image) VALUES (?, ?, ?, ?, ?, ?)",
    [name, description || null, price, duration, status, image]
  );

  return result.insertId;
};

const replacePackageServices = async (packageId, serviceIds) => {
  await db.promise().query("DELETE FROM package_services WHERE package_id=?", [packageId]);

  if (!serviceIds.length) return;

  const values = serviceIds.map((serviceId) => [packageId, serviceId]);
  await db.promise().query(
    "INSERT INTO package_services (package_id, service_id) VALUES ?",
    [values]
  );
};

const updatePackage = async ({ id, name, description, price, duration, status = "active", image }) => {
  const { clause, params } = buildSetClause(
    {
      name: "name",
      description: "description",
      price: "price",
      duration: "duration",
      status: "status",
      image: "image",
    },
    {
      name,
      description: description || null,
      price,
      duration,
      status,
      image: image || undefined,
    }
  );

  params.push(id);

  const [result] = await db.promise().query(
    `UPDATE packages SET ${clause} WHERE id = ?`,
    params
  );

  return result.affectedRows;
};

const findAdminPackages = async () => {
  const [rows] = await db.promise().query(
    `SELECT p.id,
            p.name,
            p.description,
            p.price,
            p.duration,
            p.status,
            p.image,
            IFNULL(
              (SELECT ROUND(AVG(f.rating), 1)
               FROM bookings b
               JOIN feedback f ON f.booking_id = b.id
               WHERE b.package_id = p.id),
              0
            ) AS rating,
            (SELECT COUNT(*)
             FROM bookings b
             WHERE b.package_id = p.id) AS booking_count,
            JSON_ARRAYAGG(
              CASE
                WHEN s.id IS NOT NULL
                THEN JSON_OBJECT('id', s.id, 'name', s.name, 'price', s.price)
              END
            ) AS services
     FROM packages p
     LEFT JOIN package_services ps ON p.id = ps.package_id
     LEFT JOIN services s ON ps.service_id = s.id
     GROUP BY p.id, p.name, p.description, p.price, p.duration, p.status, p.image`
  );

  return rows.map((pkg) => ({ ...pkg, services: parseServices(pkg.services) }));
};

const findActivePackages = async () => {
  const [rows] = await db.promise().query(
    `SELECT p.id,
            p.name,
            p.description,
            p.price,
            p.duration,
            p.image,
            IFNULL(
              (SELECT ROUND(AVG(f.rating), 1)
               FROM bookings b
               JOIN feedback f ON f.booking_id = b.id
               WHERE b.package_id = p.id),
              0
            ) AS rating,
            (SELECT COUNT(*)
             FROM bookings b
             WHERE b.package_id = p.id) AS booking_count,
            JSON_ARRAYAGG(
              CASE
                WHEN s.id IS NOT NULL
                THEN JSON_OBJECT('id', s.id, 'name', s.name, 'price', s.price)
              END
            ) AS services
     FROM packages p
     LEFT JOIN package_services ps ON p.id = ps.package_id
     LEFT JOIN services s ON ps.service_id = s.id
     WHERE p.status='active'
     GROUP BY p.id, p.name, p.description, p.price, p.duration, p.image`
  );

  return rows;
};

const findReviewsByPackageId = async (id) => {
  const [rows] = await db.promise().query(
    `SELECT u.fullname AS customer, f.rating, f.feedback_text AS review, f.created_at
     FROM feedback f
     JOIN users u ON f.user_id = u.id
     JOIN bookings b ON f.booking_id = b.id
     WHERE b.package_id = ?
     ORDER BY f.created_at DESC`,
    [id]
  );

  return rows;
};

const findActivePackageById = async (id) => {
  const [rows] = await db.promise().query(
    `SELECT p.id, p.name, p.description, p.price, p.duration, p.image,
      JSON_ARRAYAGG(
        CASE
          WHEN s.id IS NOT NULL THEN JSON_OBJECT('id', s.id, 'name', s.name, 'price', s.price, 'image', s.image, 'description', s.description)
        END
      ) AS services
    FROM packages p
    LEFT JOIN package_services ps ON p.id = ps.package_id
    LEFT JOIN services s ON ps.service_id = s.id
    WHERE p.id = ? AND p.status='active'
    GROUP BY p.id`,
    [id]
  );

  if (!rows[0]) return null;
  return { ...rows[0], services: parseServices(rows[0].services) };
};

const findAdminPackageById = async (id) => {
  const [rows] = await db.promise().query(
    `SELECT p.id, p.name, p.description, p.price, p.duration, p.status,
            JSON_ARRAYAGG(JSON_OBJECT('id', s.id, 'name', s.name, 'price', s.price)) AS services
     FROM packages p
     LEFT JOIN package_services ps ON p.id = ps.package_id
     LEFT JOIN services s ON ps.service_id = s.id
     WHERE p.id = ?
     GROUP BY p.id`,
    [id]
  );

  if (!rows[0]) return null;
  return { ...rows[0], services: parseServices(rows[0].services) };
};

const deletePackage = async (id) => {
  await db.promise().query("DELETE FROM package_services WHERE package_id=?", [id]);
  await db.promise().query("DELETE FROM packages WHERE id=?", [id]);
};

const updateStatus = async (id, status) => {
  const [result] = await db.promise().query(
    "UPDATE packages SET status=? WHERE id=?",
    [status, id]
  );

  return result.affectedRows;
};

module.exports = {
  createPackage,
  deletePackage,
  findActivePackageById,
  findActivePackages,
  findAdminPackageById,
  findAdminPackages,
  findByName,
  findReviewsByPackageId,
  replacePackageServices,
  updatePackage,
  updateStatus,
};
