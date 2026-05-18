import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

const ROOT_CAPTURE_DIR = "D:\\AG\\visitor-system\\vms_capture_faces";

export async function POST(req: Request) {
    try {
        const { visitor_name, confidence, image } = await req.json();
        const { searchParams } = new URL(req.url);
        const skipDb = searchParams.get("skipDb") === "true";

        console.log(`Face Intelligence: Processing log for ${visitor_name} (skipDb: ${skipDb})`);

        let captured_image_path = null;

        if (image) {
            // Create date folder: YYYY-MM-DD
            const now = new Date();
            const dateStr = now.toISOString().split("T")[0]; // 2026-05-16
            const dateDir = path.join(ROOT_CAPTURE_DIR, dateStr);

            if (!fs.existsSync(dateDir)) {
                fs.mkdirSync(dateDir, { recursive: true });
            }

            // Create filename: Name_YYYY-MM-DD_HH-mm-ss.jpg
            const timeStr = now.getHours().toString().padStart(2, '0') + "-" +
                now.getMinutes().toString().padStart(2, '0') + "-" +
                now.getSeconds().toString().padStart(2, '0');
            
            // Sanitize name for filename
            const safeName = (visitor_name || "Unknown").replace(/[^a-z0-9]/gi, '_');
            const fileName = `${safeName}_${dateStr}_${timeStr}.jpg`;
            const filePath = path.join(dateDir, fileName);

            // Save image
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            fs.writeFileSync(filePath, base64Data, "base64");

            // Store relative path for database: 2026-05-16/Name_datetime.jpg
            captured_image_path = `${dateStr}/${fileName}`;
            console.log(`Face Intelligence: Image saved to ${filePath}`);
        }

        let resultData;
        if (skipDb) {
            resultData = {
                id: Date.now(),
                visitor_name,
                confidence,
                captured_image: captured_image_path,
                log_date: new Date().toISOString()
            };
        } else {
            const result = await db.query(
                "INSERT INTO face_logs (visitor_name, confidence, captured_image) VALUES ($1, $2, $3) RETURNING *",
                [visitor_name, confidence, captured_image_path]
            );
            resultData = result.rows[0];
            console.log(`Face Intelligence: Log stored in database for ${visitor_name}`);
        }

        return NextResponse.json(resultData);
    } catch (error) {
        console.error("Store face log error:", error);
        return NextResponse.json({ error: "Failed to store face log" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const result = await db.query(
            "SELECT * FROM face_logs WHERE log_date >= $1 ORDER BY log_date DESC LIMIT 50",
            [todayStart]
        );
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("Get face logs error:", error);
        return NextResponse.json({ error: "Failed to fetch face logs" }, { status: 500 });
    }
}
