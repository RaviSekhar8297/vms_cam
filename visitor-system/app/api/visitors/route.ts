import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendEmailNotification, sendWhatsAppNotification } from "@/lib/notifications";
import { format } from "date-fns";

export async function GET() {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = session.user?.user || session.user;
    const { role, organization_id, id } = sessionUser;

    try {
        let query = `
      SELECT v.*, u.name as employee_name, o.name as org_name
      FROM visitors v
      LEFT JOIN users u ON v.employee_id = u.id
      LEFT JOIN organizations o ON v.organization_id = o.id
    `;
        const params: any[] = [];

        if (role === "SUPERADMIN") {
            // Superadmin sees all
        } else if (role === "ADMIN" || role === "RECEPTIONIST") {
            // See all in their org
            query += ` WHERE v.organization_id = $1`;
            params.push(organization_id);
        } else if (role === "EMPLOYEE") {
            // Employee only sees their own visitors
            query += ` WHERE v.employee_id = $1`;
            params.push(id);
        }

        query += ` ORDER BY v.created_at DESC`;

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
    if (!sessionUser || !["ADMIN", "RECEPTIONIST", "SUPERADMIN"].includes(sessionUser.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { employee_id, whom_to_meet, visitor_name, visitor_phone, purpose, check_in, visitor_image } = await req.json();

        const { rows } = await db.query(
            `INSERT INTO visitors 
        (organization_id, employee_id, whom_to_meet, visitor_name, visitor_phone, purpose, check_in, status, created_by, visitor_image) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9) RETURNING *`,
            [
                sessionUser.organization_id,
                employee_id,
                whom_to_meet,
                visitor_name,
                visitor_phone,
                purpose,
                check_in ? new Date(check_in) : new Date(),
                sessionUser.id,
                visitor_image
            ]
        );

        const newVisitor = rows[0];

        // ─── SEND NOTIFICATIONS ───────────────────────────────────────────
        if (employee_id) {
            // Fetch employee details and organization permission
            const { rows: data } = await db.query(`
                SELECT u.email, u.phone, u.name, u.email_status, u.phone_status,
                       o.is_permission, o.address, o.name as org_name
                FROM users u
                JOIN organizations o ON u.organization_id = o.id
                WHERE u.id = $1
            `, [employee_id]);

            if (data.length > 0) {
                const target = data[0];
                const dateVisit = format(newVisitor.check_in || new Date(), "yyyy-MM-dd HH:mm:ss");

                if (target.is_permission) {
                    // Send Email
                    if (target.email_status && target.email) {
                        await sendEmailNotification({
                            to: target.email,
                            meetName: target.name,
                            visitorName: visitor_name,
                            purpose: purpose,
                            address: target.address || target.org_name,
                            date: dateVisit,
                            visitorImage: visitor_image // NodeMailer handles base64 if passed as src
                        });
                    }

                    // Send WhatsApp
                    if (target.phone_status && target.phone) {
                        // For WhatsApp, base64 data URIs often don't work in AiSensy media URL.
                        // We will send a default image if captured photo is not a public URL.
                        // However, we'll try to provide the captured image if possible (simplified for now).
                        await sendWhatsAppNotification({
                            destination: target.phone,
                            meetName: target.name,
                            visitorName: visitor_name,
                            purpose: purpose,
                            address: target.address || target.org_name,
                            date: dateVisit,
                            imageUrl: "" // Will fallback to default in lib/notifications.ts
                        });
                    }
                }
            }
        }

        return NextResponse.json(newVisitor);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
