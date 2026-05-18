import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const VISITORS_IMG_DIR = "D:\\AG\\visitor-system\\visitors_img";

export async function POST(req: Request) {
    try {
        const { image } = await req.json();
        if (!image) return NextResponse.json({ error: "No image provided" }, { status: 400 });

        // Ensure directory exists
        if (!fs.existsSync(VISITORS_IMG_DIR)) {
            fs.mkdirSync(VISITORS_IMG_DIR, { recursive: true });
        }

        // Find next unknown index
        const files = fs.readdirSync(VISITORS_IMG_DIR);
        const unknownIndices = files
            .filter(f => f.startsWith("unknown_") && /\.(jpg|jpeg)$/i.test(f))
            .map(f => {
                const match = f.match(/unknown_(\d+)/);
                return match ? parseInt(match[1]) : 0;
            });
        
        const nextIndex = unknownIndices.length > 0 ? Math.max(...unknownIndices) + 1 : 1;
        const fileName = `unknown_${nextIndex}.jpg`;
        const filePath = path.join(VISITORS_IMG_DIR, fileName);

        // Save image
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(filePath, base64Data, "base64");

        console.log(`Face Intelligence: Learned new face as ${fileName}`);

        return NextResponse.json({ label: fileName });
    } catch (error) {
        console.error("Learn unknown error:", error);
        return NextResponse.json({ error: "Failed to learn unknown face" }, { status: 500 });
    }
}
