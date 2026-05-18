import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMAGE_DIR = "D:\\AG\\visitor-system\\visitors_img";

export async function GET(req: Request, { params }: { params: { filename: string } }) {
    try {
        const { filename } = await (params as any);
        const filePath = path.join(IMAGE_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return new NextResponse("Not found", { status: 404 });
        }

        const imageBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filename).toLowerCase();
        let contentType = "image/jpeg";
        if (ext === ".png") contentType = "image/png";
        
        return new NextResponse(imageBuffer, {
            headers: {
                "Content-Type": contentType,
            },
        });
    } catch (error) {
        console.error("Serve image error:", error);
        return new NextResponse("Error", { status: 500 });
    }
}
