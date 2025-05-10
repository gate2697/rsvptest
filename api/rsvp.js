const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { name } = req.body;
  if (!name) return res.status(400).send('Name is required');

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
    subject: 'New Graduation RSVP',
    text: `RSVP received from: ${name}`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send('Thank you! Your RSVP has been received.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error sending RSVP. Try again later.');
  }
};
