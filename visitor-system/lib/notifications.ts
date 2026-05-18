import nodemailer from "nodemailer";

const SMTP_CONFIG = {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "hrms@brihaspathi.com",
        pass: "wncnpxvkabohjvcb",
    },
};

const WHATSAPP_CONFIG = {
    apiUrl: "https://103.229.250.150/unified/v2/send",
    token: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJJbmZpbml0byIsImlhdCI6MTc3NTAxODE5NSwic3ViIjoiQnJpaGFzcGF0aGljYWJ6ZWs0ZnQycmVkIn0.2K30_oHzNN8kactPYCGr0ZugzMWxZMgbO4fFlLfJTQ0",
};

const DEFAULT_IMAGE = "https://t3.ftcdn.net/jpg/06/16/34/92/360_F_616349295_hw3oZYyNeRrz2s1h2n6x5fBLwHUA4Gpw.jpg";

export async function sendEmailNotification({
    to,
    meetName,
    visitorName,
    purpose,
    address,
    date,
    visitorImage
}: {
    to: string;
    meetName: string;
    visitorName: string;
    purpose: string;
    address: string;
    date: string;
    visitorImage?: string;
}) {
    try {
        const transporter = nodemailer.createTransport(SMTP_CONFIG);
        const displayPhoto = visitorImage || "https://cdn.nationalcareers.service.gov.uk/media/careers-advice/interview-tips/interview-tips-mobile-header.png";

        const html = `
            <div style="background-color: #0c1222; color: white; border-radius: 20px; overflow: hidden; max-width: 600px; margin: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <!-- Left side: Circular Image -->
                        <td style="width: 38%; padding: 25px; text-align: center; vertical-align: middle;">
                            <div style="width: 180px; height: 180px; border-radius: 50%; overflow: hidden; border: 3px solid rgba(255,255,255,0.2); margin: auto; background-color: #1e293b;">
                                <img src="${displayPhoto}" style="width: 100%; height: 100%; object-fit: cover; display: block;" alt="Visitor" />
                            </div>
                        </td>
                        
                        <!-- Right side: Content -->
                        <td style="width: 62%; padding: 30px 30px 30px 0; vertical-align: top;">
                            <h1 style="margin: 0; font-size: 26px; color: #b794f4; font-weight: 900; letter-spacing: -0.5px;">Dear <span style="text-decoration: none;">${meetName}</span>,</h1>
                            <p style="margin: 8px 0 20px; font-size: 16px; color: #718096; font-weight: 500;">${visitorName} has arrived to meet you!</p>
                            
                            <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
                                <tr>
                                    <td style="padding: 8px 0; color: #4299e1; font-weight: 700; width: 130px;">Visitor Name:</td>
                                    <td style="padding: 8px 0; color: #f7fafc; font-weight: 600;">${visitorName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #4299e1; font-weight: 700;">Purpose:</td>
                                    <td style="padding: 8px 0; color: #f7fafc; font-weight: 600;">${purpose}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #4299e1; font-weight: 700;">Location:</td>
                                    <td style="padding: 8px 0; color: #f7fafc; font-weight: 600;">${address}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #4299e1; font-weight: 700;">Time:</td>
                                    <td style="padding: 8px 0; color: #f7fafc; font-weight: 600;">${date}</td>
                                </tr>
                            </table>
                            
                            
                        </td>
                    </tr>
                </table>
            </div>
        `;

        await transporter.sendMail({
            from: `"SmartHR VMS" <${SMTP_CONFIG.auth.user}>`,
            to,
            subject: `Visitor Alert: ${visitorName} has arrived`,
            html,
        });
        return true;
    } catch (error) {
        console.error("Email send error:", error);
        return false;
    }
}

export async function sendWhatsAppNotification({
    destination,
    meetName,
    visitorName,
    purpose,
    address,
    date,
    imageUrl
}: {
    destination: string;
    meetName: string;
    visitorName: string;
    purpose: string;
    address: string;
    date: string;
    imageUrl: string;
}) {
    try {
        const finalImageUrl = imageUrl || DEFAULT_IMAGE;
        // The API expects a yyyy-MM-dd format for the template info date part usually, 
        // but we'll use the passed date. If it contains time, we might need to split it.
        const d = new Date();
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        const datePart = `${year}-${month}-${day}`;

        const payload = {
            apiver: "1.0",
            whatsapp: {
                ver: "2.0",
                messages: [
                    {
                        coding: 1,
                        id: "msg_" + Date.now(),
                        msgtype: 3,
                        type: "image",
                        contenttype: "image/jpeg",
                        templateid: "1727467",
                        templateinfo: `1727467~${meetName}{1}~${visitorName}{2}~${purpose}{3}~${address}{4}~${datePart}{5}`,
                        mediadata: finalImageUrl,
                        addresses: [
                            {
                                seq: "1",
                                to: destination.startsWith("91") ? destination : "91" + destination,
                                from: "919000552765"
                            }
                        ]
                    }
                ]
            }
        };

        console.log("WhatsApp Payload:", JSON.stringify(payload, null, 2));
        const response = await fetch(WHATSAPP_CONFIG.apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": WHATSAPP_CONFIG.token
            },
            body: JSON.stringify(payload),
        });

        const result = await response.text();
        console.log("WhatsApp API Response Status:", response.status);
        console.log("WhatsApp API Response Body:", result);

        return response.ok;
    } catch (error) {
        console.error("WhatsApp send error:", error);
        return false;
    }
}
