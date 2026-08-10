export const passwordResetConfirmationTemplate = (
  message: string,
  logoUrl: string,
) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f1220; padding: 36px 16px; margin: 0; box-sizing: border-box;">
  <div style="max-width: 560px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.35);">

    <!-- Header -->
    <div style="background-color: #0A0E27; padding: 22px 0; text-align: center;">
      <img src="${logoUrl}" alt="GalaxyBooking" style="max-height: 38px; width: auto;" />
    </div>

    <!-- Body -->
    <div style="background-color: #ffffff; padding: 36px 32px 28px;">

      <!-- Success Icon -->
      <div style="text-align: center; margin-bottom: 18px;">
        <div style="display: inline-block; width: 64px; height: 64px; border-radius: 50%; background-color: #ecfdf5; border: 3px solid #10B981; line-height: 58px;">
          <span style="font-size: 28px; color: #10B981;">&#10003;</span>
        </div>
      </div>

      <!-- Title -->
      <h2 style="margin: 0 0 12px; text-align: center; font-size: 22px; font-weight: 700; color: #0A0E27;">
        Password Reset Successful
      </h2>

      <!-- Green Accent Line -->
      <div style="width: 48px; height: 3px; background-color: #10B981; margin: 0 auto 22px; border-radius: 2px;"></div>

      <!-- Message -->
      <p style="font-size: 15px; color: #6B7280; line-height: 1.7; margin: 0 0 22px; text-align: center;">
        ${message}
      </p>

      <!-- Security Warning Box -->
      <div style="background-color: #fef2f2; border-left: 4px solid #EF4444; border-radius: 6px; padding: 14px 18px;">
        <p style="margin: 0; font-size: 13px; color: #EF4444; line-height: 1.6;">
          <strong>Security Notice:</strong> If you did not initiate this change, please reset your password immediately and contact our support team.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #1A1F3A; padding: 20px 28px; text-align: center;">
      <p style="margin: 0; font-size: 13px; color: #A0A8B8; line-height: 1.5;">
        Need help? Contact our support team at
        <a href="mailto:support@galaxybooking.com" style="color: #E8B923; text-decoration: none;">support@galaxybooking.com</a>
      </p>
    </div>

  </div>
</div>
`;
