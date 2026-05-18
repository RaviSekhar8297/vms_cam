import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function getAdminUser() {
    const session = await getSession();
    const user = session?.user?.user || session?.user;
    if (!user || !["SUPERADMIN", "ADMIN"].includes(user.role)) return null;
    return user;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { rows } = await db.query(
        "SELECT id, name, email, phone, role, is_active, organization_id FROM users WHERE id = $1",
        [id]
    );
    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const { name, email, phone, role, is_active, password, email_status, phone_status } = await req.json();

        // Security check: If ADMIN, ensure they are managing a user in their own org
        if (admin.role === "ADMIN") {
            const { rows: targetUser } = await db.query("SELECT organization_id FROM users WHERE id = $1", [id]);
            if (targetUser.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
            if (targetUser[0].organization_id !== admin.organization_id) {
                return NextResponse.json({ error: "Forbidden: Cannot edit users outside your organization" }, { status: 403 });
            }

            // ADMIN cannot promote to SUPERADMIN or ADMIN (per previous rules)
            if (role === "SUPERADMIN" || role === "ADMIN") {
                return NextResponse.json({ error: "Insufficient privileges for this role" }, { status: 403 });
            }
        }

        let query: string;
        let queryParams: any[];

        if (password) {
            query = `UPDATE users SET name=$1, email=$2, phone=$3, role=$4, is_active=$5, email_status=$6, phone_status=$7,
                     password=crypt($8, gen_salt('bf')) WHERE id=$9 RETURNING id, name, email, role, is_active, email_status, phone_status`;
            queryParams = [name, email, phone, role, is_active, !!email_status, !!phone_status, password, id];
        } else {
            query = `UPDATE users SET name=$1, email=$2, phone=$3, role=$4, is_active=$5, email_status=$6, phone_status=$7
                     WHERE id=$8 RETURNING id, name, email, role, is_active, email_status, phone_status`;
            queryParams = [name, email, phone, role, is_active, !!email_status, !!phone_status, id];
        }

        const { rows } = await db.query(query, queryParams);
        if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(rows[0]);
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: "Server error", details: error.message }, { status: 500 });
    }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        // If ADMIN, check if user is in their org and not themselves
        if (admin.role === "ADMIN") {
            if (admin.id === id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 403 });

            const { rows: targetUser } = await db.query("SELECT organization_id FROM users WHERE id = $1", [id]);
            if (targetUser.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
            if (targetUser[0].organization_id !== admin.organization_id) {
                return NextResponse.json({ error: "Forbidden: Not in your organization" }, { status: 403 });
            }
        }

        await db.query("DELETE FROM users WHERE id = $1", [id]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
