const { kv } = require('@vercel/kv');
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  // Handling GET request to fetch the RSVP list
  if (req.method === 'GET') {
    try {
      // Fetch the RSVP list from Vercel KV
      const rsvpList = await kv.lrange('rsvp_list', 0, -1);
      return res.status(200).json({
        message: 'RSVP list retrieved successfully.',
        rsvpList
      });
    } catch (err) {
      console.error('Error fetching RSVP list:', err);
      return res.status(500).json({ error: 'Failed to retrieve RSVP list.' });
    }
  }

  // Handling POST request to add a new RSVP
  if (req.method === 'POST') {
    const { name: guestName } = req.body; // Extract name from body
    if (!guestName) return res.status(400).json({ error: 'Name is required' }); // Ensure name is provided

    try {
      // Append the guest name to the RSVP list in Vercel KV
      await kv.rpush('rsvp_list', guestName);
    } catch (err) {
      console.error('Error saving to KV:', err);
      return res.status(500).json({ error: 'Error saving RSVP to list.' });
    }

    // Set up Nodemailer to send an email notification
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
      // Send the confirmation email to the recipients
      await transporter.sendMail(mailOptions);
    } catch (err) {
      console.error('Error sending email:', err);
      return res.status(500).json({ error: 'Error sending RSVP confirmation email.' });
    }

    // Fetch the updated RSVP list
    let rsvpList;
    try {
      rsvpList = await kv.lrange('rsvp_list', 0, -1);
    } catch (err) {
      console.error('Error fetching RSVP list from KV:', err);
      return res.status(500).json({ error: 'Error fetching updated RSVP list.' });
    }

    // Send the response back to the client with confirmation and updated list
    return res.status(200).json({
      message: 'Thank you! Your RSVP has been received.',
      rsvpList
    });
  }

  // Handling DELETE request to clear the RSVP list
  // Handling DELETE request
if (req.method === 'DELETE') {
  const { name } = req.body || {};
  
  try {
    if (name) {
      // Remove one instance of the name from the list
      await kv.lrem('rsvp_list', 1, name);
      return res.status(200).json({ message: `${name} was removed from the RSVP list.` });
    } else {
      // No name provided — delete the entire list
      await kv.del('rsvp_list');
      return res.status(200).json({ message: 'RSVP list cleared successfully.' });
    }
  } catch (err) {
    console.error('Error deleting RSVP item(s):', err);
    return res.status(500).json({ error: 'Error deleting RSVP entry.' });
  }
}


  // Handling unsupported methods
  res.setHeader('Allow', ['POST', 'GET', 'DELETE']);
  return res.status(405).json({ error: 'Method Not Allowed' });
};
