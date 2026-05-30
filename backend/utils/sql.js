const buildSetClause = (allowedColumns, values) => {
  const assignments = [];
  const params = [];

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined) return;

    const column = allowedColumns[key];
    if (!column) {
      throw new Error(`Invalid SQL update field: ${key}`);
    }

    assignments.push(`${column} = ?`);
    params.push(value);
  });

  if (assignments.length === 0) {
    throw new Error("No valid fields provided for update");
  }

  return {
    clause: assignments.join(", "),
    params,
  };
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

module.exports = {
  buildSetClause,
  parsePositiveInt,
};
