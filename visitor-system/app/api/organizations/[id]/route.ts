import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function getSuperAdmin() {
    const session = await getSession();
    const user = session?.user?.user || session?.user;
    if (!user || user.role !== "SUPERADMIN") return null;
    return user;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await getSuperAdmin();
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { rows } = await db.query(
        "SELECT id, name, address, is_permission, created_at FROM organizations WHERE id = $1",
        [id]
    );
    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await getSuperAdmin();
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const { name, address, is_permission } = await req.json();
        const { rows } = await db.query(
            "UPDATE organizations SET name = $1, address = $2, is_permission = $3 WHERE id = $4 RETURNING *",
            [name, address, is_permission, id]
        );
        if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(rows[0]);
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: "Server error", details: error.message }, { status: 500 });
    }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await getSuperAdmin();
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        await db.query("DELETE FROM organizations WHERE id = $1", [id]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
