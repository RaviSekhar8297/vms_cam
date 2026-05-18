import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const ROOT_CAPTURE_DIR = "D:\\AG\\visitor-system\\vms_capture_faces";

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    try {
        const { path: pathSegments } = await params;
        const filePath = path.join(ROOT_CAPTURE_DIR, ...pathSegments);

        console.log("Serving captured image:", filePath);

        if (!fs.existsSync(filePath)) {
            console.error("Image not found on disk:", filePath);
            return new NextResponse("Image not found", { status: 404 });
        }

        const imageBuffer = fs.readFileSync(filePath);
        return new NextResponse(imageBuffer, {
            headers: {
                "Content-Type": "image/jpeg",
                "Cache-Control": "no-store, max-age=0",
            },
        });
    } catch (error) {
        console.error("Serve face log image error:", error);
        return new NextResponse("Error serving image", { status: 500 });
    }
}
