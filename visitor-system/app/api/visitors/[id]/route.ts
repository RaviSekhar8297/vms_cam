import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function getAuthorized() {
    const session = await getSession();
    const user = session?.user?.user || session?.user;
    if (!user || !["SUPERADMIN", "ADMIN", "RECEPTIONIST"].includes(user.role)) return null;
    return user;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthorized();
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    try {
        const body = await req.json();
        const { status, check_out, visitor_name, visitor_phone, whom_to_meet, purpose } = body;

        // If editing visitor details
        if (visitor_name !== undefined) {
            const { rows } = await db.query(
                `UPDATE visitors SET
                    visitor_name = COALESCE($1, visitor_name),
                    visitor_phone = COALESCE($2, visitor_phone),
                    whom_to_meet = COALESCE($3, whom_to_meet),
                    purpose = COALESCE($4, purpose)
                WHERE id = $5 RETURNING *`,
                [visitor_name, visitor_phone, whom_to_meet, purpose, id]
            );
            return NextResponse.json(rows[0]);
        }

        // Checkout / status update
        const { rows } = await db.query(
            `UPDATE visitors
             SET status = COALESCE($1, status),
                 check_out = COALESCE($2, check_out)
             WHERE id = $3 RETURNING *`,
            [status, check_out ? new Date(check_out) : null, id]
        );

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthorized();
    if (!user || !["SUPERADMIN", "ADMIN"].includes(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    try {
        await db.query("DELETE FROM visitors WHERE id = $1", [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
