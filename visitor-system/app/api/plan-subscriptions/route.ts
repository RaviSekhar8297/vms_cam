import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = session.user?.user || session.user;
    const { role } = currentUser;

    if (!["SUPERADMIN", "ADMIN"].includes(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const query = `
            SELECT ps.*, p.plan_name, p.plan_type, p.amount, o.name as organization_name
            FROM plan_subscriptions ps
            JOIN plans p ON ps.plan_id = p.id
            JOIN organizations o ON ps.organization_id = o.id
            ORDER BY ps.created_at DESC
        `;
        const { rows } = await db.query(query);
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
        const { organization_id, plan_id, start_date, end_date, status, payment_mode } = await req.json();

        // Mark existing active plans for this organization as inactive (Renewal Logic)
        await db.query(
            "UPDATE plan_subscriptions SET status = 'inactive' WHERE organization_id = $1 AND status = 'active'",
            [organization_id]
        );

        const { rows } = await db.query(
            "INSERT INTO plan_subscriptions (organization_id, plan_id, start_date, end_date, status, payment_mode) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [organization_id, plan_id, start_date, end_date, status || 'active', payment_mode || 'offline']
        );
        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const session = await getSession();
    const currentUser = session?.user?.user || session?.user;
    if (!currentUser || currentUser.role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        await db.query("DELETE FROM plan_subscriptions WHERE id = $1", [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
