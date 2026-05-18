import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
        return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    try {
        // Strip non-numeric characters for comparison
        const numericPhone = phone.replace(/\D/g, '');

        // We check if numeric version matches
        const { rows } = await db.query(
            `SELECT id, visitor_name FROM visitors 
             WHERE regexp_replace(visitor_phone, '[^0-9]', '', 'g') = $1 
             LIMIT 1`,
            [numericPhone]
        );

        if (rows.length > 0) {
            return NextResponse.json({ exists: true, visitor: rows[0] });
        } else {
            return NextResponse.json({ exists: false });
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
