let admin;

try {
  admin = require("firebase-admin");

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
} catch (err) {
  console.warn("⚠️ Firebase not configured. Push notifications disabled.");
}

/**
 * Send push notification to admin when new booking arrives
 */
exports.sendAdminNotification = async (adminFcmToken, booking) => {
  if (!admin || !adminFcmToken) return;

  try {
    const message = {
      token: adminFcmToken,
      notification: {
        title: "🔔 New Booking Received!",
        body: `${booking.customerSnapshot.name} booked ${booking.service.serviceName}`,
      },
      data: {
        bookingId: booking.bookingId,
        type: "new_booking",
      },
    };

    await admin.messaging().send(message);
    console.log("✅ Admin notification sent");
  } catch (error) {
    console.error("❌ Push notification error:", error.message);
  }
};

/**
 * Send push notification to customer (booking status update)
 */
exports.sendCustomerNotification = async (customerFcmToken, title, body, data = {}) => {
  if (!admin || !customerFcmToken) return;

  try {
    const message = {
      token: customerFcmToken,
      notification: { title, body },
      data: { ...data },
    };

    await admin.messaging().send(message);
    console.log("✅ Customer notification sent");
  } catch (error) {
    console.error("❌ Push notification error:", error.message);
  }
};
