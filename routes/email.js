const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendOtpEmail(to, otp) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject: 'Collabsphere OTP Verification',
        html: `<p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p>`
    };
    await transporter.sendMail(mailOptions);
}

module.exports = { sendOtpEmail };
