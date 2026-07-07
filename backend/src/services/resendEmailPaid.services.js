//resend is paid.
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (email, token) => {

    console.log("Sending verification email to :", email)
    await resend.emails.send({

        from: "Auth API <onboarding@resend.dev>",

        to: email,

        subject: "Verify Your Email Address",

        html: `
            <div style="max-width:600px;margin:auto;padding:30px;font-family:Arial,sans-serif;background:#fafafa;border:1px solid #e5e5e5;border-radius:12px;">

                <h2 style="color:#222;margin-bottom:10px;">
                    Welcome to the Auth API Template by Radhika Gupta
                </h2>

                <p style="color:#555;font-size:16px;line-height:1.6;">
                    Thank you for registering. Before you can log in, please verify your email address.
                </p>

                <p style="color:#555;font-size:16px;">
                    Since the frontend is currently under development, use the verification token below in your API request.
                </p>

                <div style="background:#ffffff;border:2px dashed #b8898e;padding:18px;border-radius:10px;margin:25px 0;text-align:center;">
                    <p style="margin:0;color:#888;font-size:14px;">Verification Token</p>

                    <h3 style="margin:12px 0;color:#b8898e;word-break:break-all;">
                        ${token}
                    </h3>
                </div>

                <p style="color:#555;font-size:15px;">
                    This token will expire in <strong>30 minutes</strong>.
                </p>

                <p style="color:#555;font-size:15px;">
                    Make a <strong>GET</strong> request in Postman to:
                </p>

                <div style="background:#f3f3f3;padding:14px;border-radius:8px;font-family:monospace;word-break:break-all;">
                    GET /api/auth/users/verify-email/&lt;YOUR_TOKEN&gt;
                </div>

                <p style="margin-top:25px;color:#888;font-size:14px;">
                    If you did not create this account, you can safely ignore this email.
                </p>

                <hr style="margin:30px 0;border:none;border-top:1px solid #ddd;">

                <p style="color:#999;font-size:13px;text-align:center;">
                    MERN Auth API Template • Built with ❤️ by Radhika Gupta
                </p>
            </div>
        `

    });

};

export const sendResetPasswordEmail = async (email, token) => {

    await resend.emails.send({

        from: "Auth API <onboarding@resend.dev>",

        to: email,

        subject: "Reset Password",

        html: `
            <div style="max-width:600px;margin:auto;padding:30px;font-family:Arial,sans-serif;background:#fafafa;border:1px solid #e5e5e5;border-radius:12px;">

                <h2 style="color:#222;margin-bottom:10px;">
                    Password Reset Request 
                </h2>

                <p style="color:#555;font-size:16px;line-height:1.6;">
                    We received a request to reset the password associated with your account.
                </p>

                <p style="color:#555;font-size:16px;">
                    Since the frontend is currently under development, use the reset token below while testing with Postman.
                </p>

                <div style="background:#ffffff;border:2px dashed #B8898E;padding:18px;border-radius:10px;margin:25px 0;text-align:center;">
                    <p style="margin:0;color:#888;font-size:14px;">
                        Password Reset Token
                    </p>

                    <h3 style="margin:12px 0;color:#B8898E;word-break:break-all;">
                        ${token}
                    </h3>
                </div>

                <p style="color:#555;font-size:15px;">
                    This token will expire in <strong>30 minutes</strong>.
                </p>

                <p style="color:#555;font-size:15px;">
                    Use the following endpoint in Postman:
                </p>

                <div style="background:#f3f3f3;padding:14px;border-radius:8px;font-family:monospace;word-break:break-all;">
                    POST /api/auth/users/resetPassword/&lt;YOUR_TOKEN&gt;
                </div>

                <p style="margin-top:20px;color:#555;font-size:15px;">
                    Example Request Body:
                </p>

                <div style="background:#f3f3f3;padding:14px;border-radius:8px;font-family:monospace;white-space:pre-wrap;">
{
    "password": "NewPassword123",
    "confirmPassword": "NewPassword123"
}
                </div>

                <p style="margin-top:25px;color:#888;font-size:14px;">
                    If you did not request a password reset, you can safely ignore this email. Your account will remain secure.
                </p>

                <hr style="margin:30px 0;border:none;border-top:1px solid #ddd;">

                <p style="color:#999;font-size:13px;text-align:center;">
                    MERN Auth API Template • Built with ❤️ by Radhika Gupta
                </p>

            </div>
        `


    });

};