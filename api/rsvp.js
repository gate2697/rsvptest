const { kv } = require('@vercel/kv');
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({ message: 'RSVP API is reachable.' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'GET']);
    return res.status(405).send('Method Not Allowed');
  }

  const { name: guestName } = req.body; // Extract name from body
  if (!guestName) return res.status(400).send('Name is required'); // Check if name is present

  try {
    await kv.rpush('rsvp_list', guestName); // Append to list in Vercel KV
  } catch (err) {
    console.error('Error saving to KV:', err);
    return res.status(500).send('Error saving RSVP');
  }

  // Send confirmation email (using nodemailer)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const recipients = process.env.EMAIL_TO?.split(',') || [process.env.EMAIL_USER];

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipients,
    subject: 'New Graduation RSVP Alert',
    text: `${guestName} is coming to Nicholas' graduation party`
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error sending email.');
  }

  // Get updated RSVP list
  let rsvpList;
  try {
    rsvpList = await kv.lrange('rsvp_list', 0, -1);
  } catch (err) {
    console.error('Error fetching RSVP list from KV:', err);
    return res.status(500).send('Error fetching RSVP list');
  }

  // Send response
  res.status(200).send({
    message: 'Thank you! Your RSVP has been received.',
    rsvpList
  });
};
