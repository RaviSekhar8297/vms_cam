import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMAGE_DIR = "D:\\AG\\visitor-system\\visitors_img";

export async function GET() {
    try {
        if (!fs.existsSync(IMAGE_DIR)) {
            return NextResponse.json([]);
        }
        const files = fs.readdirSync(IMAGE_DIR);
        const images = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));
        return NextResponse.json(images);
    } catch (error) {
        console.error("List images error:", error);
        return NextResponse.json({ error: "Failed to list images" }, { status: 500 });
    }
}
