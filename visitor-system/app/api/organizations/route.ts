import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = session.user?.user || session.user;
    const { role, organization_id } = currentUser;

    try {
        let query = "SELECT id, name, address, is_permission, created_at FROM organizations";
        const params: any[] = [];

        if (role !== "SUPERADMIN") {
            query += " WHERE id = $1";
            params.push(organization_id);
        }

        query += " ORDER BY created_at DESC";
        const { rows } = await db.query(query, params);
        return NextResponse.json(rows);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getSession();
    const currentUser = session?.user?.user || session?.user;
    if (!currentUser || currentUser.role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { name, address, is_permission } = await req.json();
        const { rows } = await db.query(
            "INSERT INTO organizations (name, address, is_permission) VALUES ($1, $2, $3) RETURNING *",
            [name, address, is_permission]
        );
        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
