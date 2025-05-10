const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  const list = await kv.lrange('rsvp_list', 0, -1);
  res.status(200).json({ rsvps: list });
};
