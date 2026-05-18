import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.JWT_SECRET || "default_secret_key_vms_123!";
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1d")
        .sign(key);
}

export async function decrypt(input: string): Promise<any> {
    const { payload } = await jwtVerify(input, key, {
        algorithms: ["HS256"],
    });
    return payload;
}

export async function setSession(user: any) {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
    const sessionPayload = {
        user,
        expires
    };
    const sessionToken = await encrypt(sessionPayload);

    const cookieStore = await cookies();
    cookieStore.set("session", sessionToken, {
        expires,
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
    });

    return sessionToken;
}

export async function getSession() {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;
    if (!sessionToken) return null;
    try {
        return await decrypt(sessionToken);
    } catch (error) {
        return null;
    }
}

export async function clearSession() {
    const cookieStore = await cookies();
    cookieStore.delete("session");
}
