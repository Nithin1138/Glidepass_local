const nodemailer = require('nodemailer');

const EMAIL_USER = "personalprojects1009@gmail.com";
const EMAIL_PASS = "ohhdbdcapxkazmam";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

async function runTest() {
  console.log("--- STARTING SMTP TEST ---");
  console.log("Validating connection to Gmail SMTP servers...");
  
  try {
    // Verify transporter configuration
    await transporter.verify();
    console.log("✅ SMTP Connection Successful! Credentials are valid.");
    
    // Attempt sending test mail
    const randomKey = "LP-" + Math.random().toString(36).substring(2, 7).toUpperCase() + "-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    const info = await transporter.sendMail({
      from: `"LANpad Support" <support@lanpad.app>`,
      to: "isunurichandrakala28@gmail.com",
      subject: `LANpad Test Key: ${randomKey}`,
      text: `Hello,\n\nHere is your requested LANpad test activation key: ${randomKey}\n\nBest regards,\nLANpad Support`,
    });
    
    console.log(`✅ Email sent successfully! MessageId: ${info.messageId}`);
  } catch (error) {
    console.error("❌ SMTP Verification Failed!");
    console.error(error);
  }
}

runTest();
