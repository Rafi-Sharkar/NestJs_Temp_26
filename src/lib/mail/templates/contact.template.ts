export const ContactEmailTemplate = {
  contactAdmin: (payload: any) => `
  <div style="font-family: Arial, sans-serif; padding: 20px; background: #f6f9fc; border-radius: 10px;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; padding: 30px; 
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">

      <h2 style="color: #0f172a; text-align: center; font-size: 24px; font-weight: 600;">📩 New Contact Form Submission</h2>
      <p style="color: #475569; font-size: 16px; text-align: center;">A new contact message has been submitted. Below are the details:</p>

      <table style="width: 100%; margin-top: 15px; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="font-weight: bold; padding: 8px 0;">Name:</td>
          <td style="padding: 8px 0;">${payload.name} </td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 8px 0;">Email:</td>
          <td style="padding: 8px 0;">${payload.email}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 8px 0;">Subject:</td>
          <td style="padding: 8px 0;">${payload.subject}</td>
        </tr>
      </table>

      <div style="margin-top: 20px; padding: 20px; background: #f1f5f9; border-left: 5px solid #2563eb;">
        <strong style="font-size: 16px; color: #0f172a;">Message:</strong>
        <p style="font-size: 14px; color: #475569; line-height: 1.5;">${payload.message}</p>
      </div>

      <p style="margin-top: 30px; font-size: 12px; color: #64748b; text-align: center;">
        This is an automated email. Please do not reply. If you have any further queries, please reach out to us.
      </p>

    </div>
  </div>
  `,

  contactUser: (payload: any) => `
  <div style="font-family: Arial, sans-serif; padding: 30px; background: #f9fafb;">
    <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 30px; 
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">

      <h2 style="color: #2563eb; text-align: center; font-size: 24px; font-weight: 600;">👋 Hello ${payload.name},</h2>

      <p style="color: #475569; font-size: 16px; text-align: center;">Thank you for contacting us! We’ve received your message and our support team will respond shortly.</p>

      <h3 style="margin-top: 20px; color: #0f172a; font-size: 20px; font-weight: 600;">📬 Your Submitted Details</h3>

      <table style="width: 100%; margin-top: 15px; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="font-weight: bold; padding: 8px 0;">Name:</td>
          <td style="padding: 8px 0;">${payload.name} </td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 8px 0;">Email:</td>
          <td style="padding: 8px 0;">${payload.email}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 8px 0;">Subject:</td>
          <td style="padding: 8px 0;">${payload.subject}</td>
        </tr>
      </table>

      <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-left: 5px solid #16a34a;">
        <strong style="font-size: 16px; color: #0f172a;">Message:</strong>
        <p style="font-size: 14px; color: #475569; line-height: 1.5;">${payload.message}</p>
      </div>

      <p style="font-size: 13px; margin-top: 30px; color: #94a3b8; text-align: center;">
        We appreciate your patience and will get back to you as soon as possible. 
      </p>
    </div>
  </div>
  `,

  adminReply: (payload: {
    firstName: string;
    lastName: string;
    content: string;
  }) => `
  <div style="font-family: Arial, sans-serif; padding: 30px; background: #f8fafc;">
    <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 30px; 
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">

      <h2 style="color: #1e40af; text-align: center; font-size: 24px; font-weight: 600;">Support Team Reply</h2>
      <p style="color: #475569; font-size: 16px;">Hi <strong>${payload.firstName} ${payload.lastName}</strong>,</p>

      <p style="color: #475569; font-size: 16px;">We've reviewed your inquiry and here is our response:</p>

      <div style="margin: 20px 0; padding: 18px; background: #f0f9ff; border-left: 5px solid #0ea5e9; 
        border-radius: 4px; font-size: 15px;">
        <p style="margin: 0; color: #1e293b;">${payload.content.replace(/\n/g, '<br>')}</p>
      </div>

      <p style="color: #64748b; font-size: 14px;">
        You can view the full conversation anytime by clicking the link in your confirmation email.
      </p>

      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">

      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        © 2025 Your Company. All rights reserved.
      </p>
    </div>
  </div>
  `,
};
