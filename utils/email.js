const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send OTP email to customer
 */
exports.sendOTPEmail = async (email, otp, customerName) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "ElectroFix - Your OTP Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #E53935;">ElectroFix</h2>
        <p>Hello <strong>${customerName}</strong>,</p>
        <p>Your OTP verification code is:</p>
        <div style="background: #f5f5f5; padding: 16px; text-align: center; border-radius: 6px; margin: 16px 0;">
          <h1 style="color: #E53935; letter-spacing: 8px; margin: 0;">${otp}</h1>
        </div>
        <p>This OTP is valid for <strong>10 minutes</strong>.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 12px;">ElectroFix - Electric Appliance Repair Service</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send booking confirmation email
 */
exports.sendBookingConfirmationEmail = async (email, booking, customerName) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `ElectroFix - Booking Confirmed #${booking.bookingId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #E53935;">ElectroFix</h2>
        <p>Hello <strong>${customerName}</strong>,</p>
        <p>Your booking has been received!</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Booking ID</strong></td><td style="padding: 8px; border: 1px solid #eee;">${booking.bookingId}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Service</strong></td><td style="padding: 8px; border: 1px solid #eee;">${booking.service.serviceName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Problem</strong></td><td style="padding: 8px; border: 1px solid #eee;">${booking.service.problemName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Status</strong></td><td style="padding: 8px; border: 1px solid #eee;">Pending Confirmation</td></tr>
        </table>
        <p>Our team will contact you shortly to confirm your booking.</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 12px;">ElectroFix - Electric Appliance Repair Service</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
