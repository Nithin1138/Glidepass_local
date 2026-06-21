const nodemailer = require('nodemailer');

const EMAIL_USER = "personalprojects1009@gmail.com";
const EMAIL_PASS = "ohhdbdcapxkazmam";
const RECIPIENT = "chilakaluripet9@gmail.com";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

async function runTest() {
  console.log("--- SENDING CUSTOM RECIPIENT SMTP TEST ---");
  console.log(`From: "LANpad" <${EMAIL_USER}>`);
  console.log(`To: ${RECIPIENT}`);
  
  try {
    const info = await transporter.sendMail({
      from: `"LANpad" <${EMAIL_USER}>`,
      to: RECIPIENT,
      subject: "Your LANpad License Key",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #333;">Thank you for your purchase!</h2>
          <p>You have successfully purchased the <strong>Pro Pass</strong> plan.</p>
          <p>Your license key is valid for 30 days.</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 18px; margin: 20px 0; text-align: center;">
            <strong>LP-PRO-TEST-XYZ123</strong>
          </div>
          <p>To activate your license, open the LANpad app, go to the settings or license section, and paste this key.</p>
          <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
          <p style="font-size: 12px; color: #777;">If you have any questions, please reply to this email.</p>
        </div>
      `,
    });
    
    console.log(`✅ Email sent successfully! MessageId: ${info.messageId}`);
  } catch (error) {
    console.error("❌ SMTP Send Failed!");
    console.error(error);
  }
}

runTest();
