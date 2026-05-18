import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSession } from "@/lib/auth";

export async function POST(req: Request) {
    console.log("Login request received at /api/auth/login");
    try {
        const body = await req.json();
        const { username, password } = body;

        // Check user credentials and organization status
        const { rows } = await db.query(
            `SELECT u.id, u.organization_id, u.name, u.email, u.role, u.is_active, o.is_permission as org_permission
             FROM users u
             LEFT JOIN organizations o ON u.organization_id = o.id
             WHERE (u.email = $1 OR u.name = $1 OR ($1 ~ '^[0-9a-f]{8}-' AND u.id::text = $1)) 
             AND u.password = crypt($2, u.password)`,
            [username, password]
        );

        if (rows.length === 0) {
            // For first time SUPERADMIN creation if no user exists and it's a specific credential
            // Check if this is a valid bootstrap credential for creating the first SUPERADMIN
            const isDefaultSuperAdmin =
                ((username === "superadmin@vms.com" || username === "superadmin") && password === "admin123") ||
                (username === "sa" && password === "123");

            if (isDefaultSuperAdmin) {
                const checkSuper = await db.query("SELECT * FROM users WHERE role = 'SUPERADMIN'");
                if (checkSuper.rows.length === 0) {
                    // Create super admin with the provided credentials
                    const saName = username === "sa" ? "sa" : "Super Admin";
                    const saEmail = username === "sa" ? "superadmin@vms.com" : "superadmin@vms.com";
                    await db.query(`
            INSERT INTO users (name, email, password, role) 
            VALUES ($1, $2, crypt($3, gen_salt('bf')), 'SUPERADMIN')
          `, [saName, saEmail, password]);
                    const { rows: newRows } = await db.query(
                        "SELECT id, organization_id, name, email, role, is_active FROM users WHERE role = 'SUPERADMIN' LIMIT 1"
                    );
                    const token = await setSession(newRows[0]);
                    return NextResponse.json({ success: true, user: newRows[0], token });
                }
            }
            return NextResponse.json(
                { error: "Invalid username, emp_id, or password" },
                { status: 401 }
            );
        }

        const user = rows[0];

        if (!user.is_active) {
            return NextResponse.json(
                { error: "Account is inactive. Contact Administrator." },
                { status: 403 }
            );
        }

        // Check organization permission (Skip for SUPERADMIN as they might not have an org)
        if (user.role !== "SUPERADMIN" && user.org_permission === false) {
            return NextResponse.json(
                { error: "Your Permission Denied. Please contact your administrator." },
                { status: 403 }
            );
        }

        const token = await setSession(user);
        return NextResponse.json({ success: true, user, token });
    } catch (error: any) {
        console.error("Login route error:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error.message },
            { status: 500 }
        );
    }
}
