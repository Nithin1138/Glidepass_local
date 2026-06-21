import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/mail";

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const emailBody = `
      <h3>New Support Query from LANpad Website</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-wrap;">${message}</p>
    `;

    const result = await sendEmail({
      to: "personalprojects1009@gmail.com",
      subject: `[LANpad Support] ${subject}`,
      html: emailBody,
      text: `New support query from ${name} (${email}):\n\nSubject: ${subject}\n\nMessage:\n${message}`,
    });

    if (!result.success) {
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Support API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
