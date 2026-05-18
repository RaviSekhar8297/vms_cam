import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { rows } = await db.query(
            "SELECT id, name, email, phone, role, user_image FROM users WHERE id = $1",
            [session.user.id]
        );
        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { name, email, phone, user_image, password, old_password } = await req.json();

        // If password is being changed, verify old password
        if (password) {
            if (!old_password) {
                return NextResponse.json({ error: "Old password required to set new password" }, { status: 400 });
            }

            const { rows: userRows } = await db.query(
                "SELECT password FROM users WHERE id = $1",
                [session.user.id]
            );

            const { rows: verifyRows } = await db.query(
                "SELECT (password = crypt($1, password)) as valid FROM users WHERE id = $2",
                [old_password, session.user.id]
            );

            if (!verifyRows[0]?.valid) {
                return NextResponse.json({ error: "Invalid old password" }, { status: 401 });
            }
        }

        const query = `
            UPDATE users
            SET name = COALESCE($1, name),
                email = COALESCE($2, email),
                phone = COALESCE($3, phone),
                user_image = COALESCE($4, user_image),
                password = CASE WHEN $5::text IS NOT NULL THEN crypt($5, gen_salt('bf')) ELSE password END
            WHERE id = $6
            RETURNING id, name, email, phone, role, user_image
        `;

        const { rows } = await db.query(query, [
            name || null,
            email || null,
            phone || null,
            user_image || null,
            password || null,
            session.user.id
        ]);

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error or email already exists" }, { status: 500 });
    }
}
