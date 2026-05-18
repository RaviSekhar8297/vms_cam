import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = session.user?.user || session.user;
    const { role, organization_id } = sessionUser;

    const { searchParams } = new URL(req.url);
    const fetchAll = searchParams.get("all") === "true";

    try {
        let query = `
      SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active,
             u.email_status, u.phone_status, u.organization_id, o.name as org_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
    `;
        const params: any[] = [];

        if (role === "SUPERADMIN" || fetchAll) {
            // Superadmin or requested all sees all
        } else {
            // Others see users in their org
            query += ` WHERE u.organization_id = $1`;
            params.push(organization_id);
        }

        query += ` ORDER BY u.created_at DESC`;

        const { rows } = await db.query(query, params);
        return NextResponse.json(rows);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getSession();
    const sessionUser = session?.user?.user || session?.user;
    if (!sessionUser || !["SUPERADMIN", "ADMIN"].includes(sessionUser.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { name, email, password, phone, role, organization_id, email_status, phone_status } = await req.json();

        let targetOrgId = organization_id;
        if (sessionUser.role === "ADMIN") {
            // Admins can only create users in their org
            targetOrgId = sessionUser.organization_id;
            // Admins cannot create SUPERADMIN or ADMIN
            if (role === "SUPERADMIN" || role === "ADMIN") {
                return NextResponse.json({ error: "Invalid role assigned" }, { status: 400 });
            }
        }

        const { rows } = await db.query(
            `INSERT INTO users (name, email, password, phone, role, organization_id, email_status, phone_status) 
       VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, $5, $6, $7, $8) RETURNING id, name, email, role`,
            [name, email, password, phone, role, targetOrgId, !!email_status, !!phone_status]
        );

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error or email exists" }, { status: 500 });
    }
}
