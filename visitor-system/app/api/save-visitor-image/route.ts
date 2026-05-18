import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMAGE_DIR = "D:\\AG\\visitor-system\\visitors_img";

export async function POST(req: Request) {
    try {
        const { name, image } = await req.json(); // image is base64 string
        if (!fs.existsSync(IMAGE_DIR)) {
            fs.mkdirSync(IMAGE_DIR, { recursive: true });
        }
        
        // Remove base64 header if present (e.g., data:image/jpeg;base64,...)
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        
        // Use name to create a safe filename
        const safeName = name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const fileName = `${safeName}.jpeg`;
        const filePath = path.join(IMAGE_DIR, fileName);
        
        fs.writeFileSync(filePath, buffer);
        console.log(`Saved visitor image: ${filePath}`);
        
        return NextResponse.json({ success: true, fileName });
    } catch (error: any) {
        console.error("Save visitor image error:", error.message);
        return NextResponse.json({ error: "Failed to save image" }, { status: 500 });
    }
}
