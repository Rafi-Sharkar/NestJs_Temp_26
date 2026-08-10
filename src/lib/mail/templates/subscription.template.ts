export const SubscriptionEmailTemplate = {
  // ----- Subscription Ready Email for Center -----
  subscriptionReady: (payload: any, frontendUrl: string = '') => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
        }
        .email-container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          font-size: 28px;
          margin-bottom: 10px;
          font-weight: 600;
        }
        .header p {
          font-size: 16px;
          opacity: 0.9;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          color: #333;
          margin-bottom: 20px;
        }
        .greeting strong {
          color: #667eea;
        }
        .message-box {
          background-color: #f9f9f9;
          border-left: 4px solid #667eea;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .message-box h3 {
          color: #667eea;
          margin-bottom: 12px;
          font-size: 16px;
        }
        .message-box p {
          color: #555;
          font-size: 15px;
          line-height: 1.6;
        }
        .cta-section {
          background-color: #f0f4ff;
          padding: 20px;
          border-radius: 6px;
          margin: 25px 0;
          text-align: center;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 600;
          margin: 10px 0;
          transition: transform 0.2s;
        }
        .cta-button:hover {
          transform: translateY(-2px);
        }
        .info-section {
          background-color: #f0f4ff;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .info-section h4 {
          color: #667eea;
          margin-bottom: 10px;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .info-section p {
          color: #555;
          font-size: 14px;
          line-height: 1.6;
        }
        .footer {
          background-color: #f5f5f5;
          padding: 20px 30px;
          border-top: 1px solid #eee;
          font-size: 13px;
          color: #888;
          text-align: center;
        }
        .divider {
          border-bottom: 1px solid #eee;
          margin: 25px 0;
        }
        .highlight {
          color: #667eea;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>🎉 Great News!</h1>
          <p>Your Custom Subscription is Ready</p>
        </div>

        <div class="content">
          <p class="greeting">Hello <strong>${payload.name}</strong>,</p>
          
          <p>We're thrilled to inform you that your custom subscription is now <span class="highlight">ready to go</span>! We've carefully crafted a solution tailored to your needs.</p>

          <div class="message-box">
            <h3>${payload.subject || 'Subscription Details'}</h3>
            <p>${payload.message}</p>
          </div>

          <div class="cta-section">
            <p style="font-size: 16px; font-weight: 500; margin-bottom: 15px;">Ready to get started?</p>
            <a href="${frontendUrl}/pricing" target="_blank" class="cta-button">Complete Your Subscription</a>
          </div>

          <div class="info-section">
            <h4>✓ What's Next?</h4>
            <p>Simply click the button above to complete your subscription setup. Our team is here to support you every step of the way. If you have any questions or need assistance, don't hesitate to reach out.</p>
          </div>

          <div class="divider"></div>

          <p style="color: #666; font-size: 14px; line-height: 1.8;">
            Thank you for choosing us! We're excited to partner with you and help your business grow. 🚀
          </p>
        </div>

        <div class="footer">
          <p><strong>The Support Team</strong></p>
          <p>Questions? We're here to help!</p>
          <p style="margin-top: 10px; color: #aaa;">© 2026 All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // ----- Custom Offer Subscription Confirmation Email -----
  subscriptionConfirmation: (payload: any) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
        }
        .email-container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          font-size: 28px;
          margin-bottom: 10px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          color: #333;
          margin-bottom: 20px;
        }
        .success-icon {
          font-size: 48px;
          text-align: center;
          margin: 20px 0;
        }
        .details-box {
          background-color: #f9f9f9;
          border-left: 4px solid #28a745;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .details-box h4 {
          color: #28a745;
          margin-bottom: 15px;
          font-size: 16px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          color: #666;
          font-weight: 500;
        }
        .detail-value {
          color: #333;
          font-weight: 600;
        }
        .features-list {
          background-color: #f0f4ff;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .features-list h4 {
          color: #667eea;
          margin-bottom: 15px;
          font-size: 16px;
        }
        .features-list ul {
          list-style: none;
          padding: 0;
        }
        .features-list li {
          padding: 8px 0;
          padding-left: 25px;
          position: relative;
          color: #555;
          font-size: 14px;
        }
        .features-list li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #28a745;
          font-weight: bold;
          font-size: 16px;
        }
        .footer {
          background-color: #f5f5f5;
          padding: 20px 30px;
          border-top: 1px solid #eee;
          font-size: 13px;
          color: #888;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>✅ Subscription Confirmed!</h1>
        </div>

        <div class="content">
          <div class="success-icon">🎊</div>
          <p class="greeting">Hello,</p>
          
          <p>We're excited to confirm that you have successfully subscribed to our custom offers! Your custom plan is now active and ready to use.</p>

          <div class="details-box">
            <h4>Your Subscription Details</h4>
            <div class="detail-row">
              <span class="detail-label">Custom Price:</span>
              <span class="detail-value">$${payload.customPrice}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Plan Details:</span>
              <span class="detail-value">${payload.message}</span>
            </div>
          </div>

          <div class="features-list">
            <h4>📋 Included Features</h4>
            <ul>
              ${payload.features.map((feature: string) => `<li>${feature}</li>`).join('')}
            </ul>
          </div>

          <p style="color: #666; font-size: 15px; line-height: 1.8; margin: 20px 0;">
            You can now enjoy all the benefits of your custom subscription. If you have any questions or need support, our team is always here to help.
          </p>
        </div>

        <div class="footer">
          <p><strong>Thank you for your business!</strong></p>
          <p>© 2026 All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // ----- Admin Notification for Custom Subscription -----
  subscriptionAdmin: (payload: any) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
        }
        .email-container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          font-size: 28px;
          margin-bottom: 10px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .notification-box {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .notification-box h3 {
          color: #856404;
          margin-bottom: 10px;
          font-size: 16px;
        }
        .notification-box p {
          color: #856404;
          font-size: 14px;
        }
        .details-box {
          background-color: #f9f9f9;
          border: 1px solid #eee;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
          font-size: 14px;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          color: #666;
          font-weight: 500;
        }
        .detail-value {
          color: #333;
          font-weight: 600;
          text-align: right;
        }
        .features-section {
          background-color: #f0f4ff;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .features-section h4 {
          color: #667eea;
          margin-bottom: 15px;
          font-size: 16px;
        }
        .features-section ul {
          list-style: none;
          padding: 0;
        }
        .features-section li {
          padding: 8px 0;
          padding-left: 25px;
          position: relative;
          color: #555;
          font-size: 14px;
        }
        .features-section li:before {
          content: "▸";
          position: absolute;
          left: 0;
          color: #667eea;
          font-weight: bold;
        }
        .footer {
          background-color: #f5f5f5;
          padding: 20px 30px;
          border-top: 1px solid #eee;
          font-size: 13px;
          color: #888;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>📢 New Custom Offer Subscription</h1>
        </div>

        <div class="content">
          <div class="notification-box">
            <h3>⚡ New Subscription Received</h3>
            <p>A new custom offer subscription has been submitted and requires your review.</p>
          </div>

          <div class="details-box">
            <div class="detail-row">
              <span class="detail-label">Custom Price:</span>
              <span class="detail-value">$${payload.customPrice}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Details:</span>
            </div>
          </div>

          <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #667eea; border-radius: 4px; margin: 20px 0;">
            <p style="color: #555; font-size: 14px; line-height: 1.6;">${payload.message}</p>
          </div>

          <div class="features-section">
            <h4>Features Requested</h4>
            <ul>
              ${payload.features.map((feature: string) => `<li>${feature}</li>`).join('')}
            </ul>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
            Please review this subscription request and take appropriate action through your admin dashboard.
          </p>
        </div>

        <div class="footer">
          <p><strong>Subscription Management System</strong></p>
          <p>© 2026 All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `,
};
