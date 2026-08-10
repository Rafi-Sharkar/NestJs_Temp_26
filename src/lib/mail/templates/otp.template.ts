export const otpTemplate = ({
  title,
  message,
  code,
  footer,
  logoUrl,
  loginEmail,
  loginPassword,
}: {
  title: string;
  message: string;
  code: string;
  footer: string;
  logoUrl: string;
  loginEmail?: string;
  loginPassword?: string;
}) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 40px 16px; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); background-color: #ffffff;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0A0E27 0%, #1E2A5E 100%); padding: 22px 0; text-align: center;">
      <span style="display: block; margin-top: 7px; font-size: 32px; color: #cfd0d1;"><b>Raiz App Registration</b></span>
    </div>

    <!-- Body -->
    <div style="padding: 40px 36px 32px; background-color: #ffffff;">

      <!-- Title -->
      <h2 style="margin: 0 0 8px; text-align: center; font-size: 24px; font-weight: 700; color: #1E2937;">
        ${title}
      </h2>

      <!-- Subtitle -->
      <p style="text-align: center; color: #64748B; font-size: 15.5px; margin: 0 0 28px; line-height: 1.6;">
        ${message}
      </p>

      <!-- Login Credentials (if any) -->
      ${
        loginEmail && loginPassword
          ? `<div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
              <p style="margin: 0 0 12px; font-size: 13px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
                Your Login Credentials
              </p>
              <p style="margin: 0 0 8px; font-size: 15px; color: #334155;">
                <strong>Email:</strong> ${loginEmail}
              </p>
              <p style="margin: 0; font-size: 15px; color: #334155;">
                <strong>Password:</strong> ${loginPassword}
              </p>
            </div>`
          : ''
      }

      <!-- OTP Box -->
      <div style="background: linear-gradient(135deg, #0F172A 0%, #1E2937 100%); 
                  border-radius: 16px; 
                  padding: 28px 20px; 
                  text-align: center; 
                  margin-bottom: 24px;
                  box-shadow: 0 4px 15px rgba(15, 23, 42, 0.15);">
        
        <p style="margin: 0 0 10px; font-size: 13px; color: #94A3B8; font-weight: 500; letter-spacing: 1.2px; text-transform: uppercase;">
          Verification Code
        </p>
        
        <p style="margin: 0; font-size: 42px; font-weight: 700; color: #FACC15; 
                  letter-spacing: 12px; font-family: 'Courier New', monospace; 
                  text-shadow: 0 2px 8px rgba(250, 204, 21, 0.3);">
          ${code}
        </p>
      </div>

      <!-- Expiry Note -->
      <div style="text-align: center;">
        <p style="font-size: 14px; color: #64748B; margin: 0 0 4px;">
          This code will expire in <strong style="color: #E11D48;">5 minutes</strong>
        </p>
        <p style="font-size: 13.5px; color: #94A3B8; margin: 0;">
          Please do not share this code with anyone.
        </p>
      </div>

    </div>

    <!-- Friendly Footer -->
    <div style="background-color: #F8FAFC; padding: 28px 36px; text-align: center; border-top: 1px solid #F1F5F9;">
      <p style="margin: 0; font-size: 13.5px; color: #64748B; line-height: 1.6;">
        ${footer}
      </p>
      <p style="margin: 12px 0 0; font-size: 12px; color: #94A3B8;">
        Need help? Just reply to this email 💙
      </p>
    </div>

  </div>
</div>
`;

export const LoginCredentials = ({
  title,
  message,
  footer,
  logoUrl,
  loginEmail,
  loginPassword,
}: {
  title: string;
  message: string;
  footer: string;
  logoUrl: string;
  loginEmail?: string;
  loginPassword?: string;
}) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 40px 16px; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); background-color: #ffffff;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0A0E27 0%, #1E2A5E 100%); padding: 22px 0; text-align: center;">
      <span style="display: block; margin-top: 7px; font-size: 32px; color: #cfd0d1;"><b>Raiz App Registration</b></span>
    </div>

    <!-- Body -->
    <div style="padding: 40px 36px 32px; background-color: #ffffff;">

      <!-- Title -->
      <h2 style="margin: 0 0 8px; text-align: center; font-size: 24px; font-weight: 700; color: #1E2937;">
        ${title}
      </h2>

      <!-- Subtitle -->
      <p style="text-align: center; color: #64748B; font-size: 15.5px; margin: 0 0 28px; line-height: 1.6;">
        ${message}
      </p>

      <!-- Login Credentials -->
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <p style="margin: 0 0 12px; font-size: 13px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
          Your Login Credentials
        </p>
        <p style="margin: 0 0 8px; font-size: 15px; color: #334155;">
          <strong>Email:</strong> ${loginEmail || 'N/A'}
        </p>
        <p style="margin: 0; font-size: 15px; color: #334155;">
          <strong>Password:</strong> ${loginPassword || 'N/A'}
        </p>
      </div>

      <div style="text-align: center;">
        <p style="font-size: 13.5px; color: #94A3B8; margin: 0;">
          For your security, please change your password after your first login.
        </p>
      </div>

    </div>

    <!-- Friendly Footer -->
    <div style="background-color: #F8FAFC; padding: 28px 36px; text-align: center; border-top: 1px solid #F1F5F9;">
      <p style="margin: 0; font-size: 13.5px; color: #64748B; line-height: 1.6;">
        ${footer}
      </p>
      <p style="margin: 12px 0 0; font-size: 12px; color: #94A3B8;">
        Need help? Just reply to this email.
      </p>
    </div>

  </div>
</div>
`;
