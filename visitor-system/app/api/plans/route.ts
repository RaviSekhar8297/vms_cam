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

    // Plans are visible for Admin/SuperAdmin/Receptionist?
    // User mentioned SuperAdmin, let's keep it restricted to SuperAdmin/Admin.
    if (!["SUPERADMIN", "ADMIN"].includes(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const plans = await db.query("SELECT * FROM plans ORDER BY created_at DESC");
        return NextResponse.json(plans.rows);
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
        const { plan_name, plan_type, amount, status } = await req.json();
        const { rows } = await db.query(
            "INSERT INTO plans (plan_name, plan_type, amount, status) VALUES ($1, $2, $3, $4) RETURNING *",
            [plan_name, plan_type, amount, status || 'active']
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
        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await db.query("DELETE FROM plans WHERE id = $1", [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
