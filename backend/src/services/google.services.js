import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);

const verifyGoogleToken = async (idToken) => {
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        return {
            googleId: payload.sub,
            fullname: payload.name,
            email: payload.email,
            avatar: payload.picture,
            emailVerified: payload.email_verified,
        };
    } catch (error) {
        throw new Error("Invalid Google Token");
    }
};

export { verifyGoogleToken };