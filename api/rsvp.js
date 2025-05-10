const { kv } = require('@vercel/kv');
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { name: guestName } = req.body; // Rename 'name' to avoid TS deprecation warning
  if (!guestName) return res.status(400).send('Name is required');

  // Save RSVP name to Vercel KV list
  try {
    await kv.rpush('rsvp_list', guestName); // Append to list called 'rsvp_list'
  } catch (err) {
    console.error('Error saving to KV:', err);
    return res.status(500).send('Error saving RSVP');
  }

  // Send email
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

  // Fetch and return the current list of RSVP'd guests
  let rsvpList;
  try {
    rsvpList = await kv.lrange('rsvp_list', 0, -1); // Get all the RSVPs in the list
  } catch (err) {
    console.error('Error fetching RSVP list from KV:', err);
    return res.status(500).send('Error fetching RSVP list');
  }

  // Respond with a success message and the updated list
  res.status(200).send({
    message: 'Thank you! Your RSVP has been received.',
    rsvpList
  });
};
