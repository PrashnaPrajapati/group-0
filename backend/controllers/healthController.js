const getHealth = (req, res) => {
  res.send("Chat server is running!");
};

module.exports = {
  getHealth,
};
