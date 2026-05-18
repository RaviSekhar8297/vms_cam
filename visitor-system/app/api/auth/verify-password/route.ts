import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { password } = await req.json();

        if (!password) {
            return NextResponse.json({ error: "Password required" }, { status: 400 });
        }

        const { rows } = await db.query(
            "SELECT (password = crypt($1, password)) as valid FROM users WHERE id = $2",
            [password, session.user.id]
        );

        if (rows[0]?.valid) {
            return NextResponse.json({ valid: true });
        } else {
            return NextResponse.json({ valid: false }, { status: 401 });
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
