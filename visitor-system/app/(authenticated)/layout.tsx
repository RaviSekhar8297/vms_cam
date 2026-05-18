import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppLayout from "@/components/AppLayout";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session?.user) {
        redirect("/login");
    }

    // Handle both flat and nested session shapes
    const sessionUser = session.user?.user || session.user;

    // Fetch latest user data from DB to ensure image and other fields are up to date
    const { db } = await import("@/lib/db");
    const { rows } = await db.query(
        "SELECT id, name, email, phone, role, organization_id, user_image FROM users WHERE id = $1",
        [sessionUser.id]
    );

    const user = rows[0] || sessionUser;

    return <AppLayout user={user}>{children}</AppLayout>;
}
