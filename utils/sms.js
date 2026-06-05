const axios = require("axios");

/**
 * Send OTP via SMS using Fast2SMS
 * @param {string} mobile - 10 digit mobile number
 * @param {string} otp - OTP code
 */
exports.sendOTPSMS = async (mobile, otp) => {
  try {
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "otp",
        variables_values: otp,
        numbers: mobile,
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("SMS Error:", error.response?.data || error.message);
    throw new Error("Failed to send OTP SMS");
  }
};
