"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, RefreshCw, CheckCircle2, XCircle, AlertCircle, Loader2, ScanFace, User, Phone, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type PhoneStatus = "idle" | "checking" | "exists" | "new";

export default function AddVisitor() {
    const router = useRouter();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Camera Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<any>(null);
    const fapiReadyRef = useRef(false);

    // UI States
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [statusMsg, setStatusMsg] = useState("Initializing...");
    const [statusColor, setStatusColor] = useState("bg-gray-600/80");
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [jsStatus, setJsStatus] = useState<'checking' | 'active'>('checking');
    const [debugLogs, setDebugLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        console.log(msg);
        setDebugLogs(prev => [msg, ...prev].slice(0, 8));
    };

    // Phone Validation States
    const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>("idle");
    const phoneTimer = useRef<any>(null);

    // Form Data
    const [formData, setFormData] = useState({
        visitor_name: "",
        visitor_phone: "",
        whom_to_meet: "",
        employee_id: "",
        purpose: "",
        check_in: "",
        visitor_image: "",
    });

    // ── 1. Hydration & Initial Setup ──────────────────────────────────────────
    useEffect(() => {
        addLog("[SYSTEM] JS Ready");
        setJsStatus('active');

        // Load initial date & employees
        setFormData(p => ({ ...p, check_in: new Date().toISOString().slice(0, 16) }));

        addLog("[AUTH] Loading employees...");
        fetch("/api/users")
            .then(r => r.json())
            .then(data => {
                const emps = Array.isArray(data) ? data.filter((u: any) => ["ADMIN", "EMPLOYEE"].includes(u.role)) : [];
                setEmployees(emps);
                addLog(`[AUTH] Got ${emps.length} employees`);
                if (emps.length > 0) setFormData(p => ({ ...p, employee_id: emps[0].id }));
            })
            .catch(err => addLog(`[AUTH] ❌ Error: ${err.message}`))
            .finally(() => setLoading(false));

        return () => {
            clearInterval(intervalRef.current);
            stopCamera();
        };
    }, []);

    // ── 2. Load Face-API (Local) ──────────────────────────────────────────────
    useEffect(() => {
        if (typeof window === "undefined") return;

        const loadModels = () => {
            const fapi = (window as any).faceapi;
            if (!fapi) return;
            addLog("[FAPI] Loading models...");
            fapi.nets.tinyFaceDetector.loadFromUri("/models")
                .then(() => {
                    fapiReadyRef.current = true;
                    addLog("[FAPI] ✅ Models Ready");
                })
                .catch((e: any) => addLog(`[FAPI] ❌ Model fail: ${e.message}`));
        };

        if ((window as any).faceapi) { loadModels(); return; }

        const script = document.createElement("script");
        script.id = "fapi-script";
        script.src = "/face-api.min.js";
        script.onload = loadModels;
        script.onerror = () => addLog("[FAPI] ❌ Script failed to load");
        document.head.appendChild(script);
    }, []);

    // ── 3. Phone Validation Logic ─────────────────────────────────────────────
    useEffect(() => {
        const digits = formData.visitor_phone.replace(/\D/g, "");
        if (digits.length < 10) { setPhoneStatus("idle"); return; }

        if (phoneTimer.current) clearTimeout(phoneTimer.current);
        phoneTimer.current = setTimeout(async () => {
            setPhoneStatus("checking");
            try {
                addLog(`[PHONE] Checking: ${formData.visitor_phone}`);
                const res = await fetch(`/api/visitors/check-phone?phone=${encodeURIComponent(formData.visitor_phone)}`);
                const data = await res.json();

                if (data.exists) {
                    addLog(`[PHONE] ❌ Number Exists: ${formData.visitor_phone}`);
                    setPhoneStatus("exists");
                    if (data.visitor?.visitor_name)
                        setFormData(p => ({ ...p, visitor_name: data.visitor.visitor_name }));
                } else {
                    addLog(`[PHONE] ✅ New Number: ${formData.visitor_phone}`);
                    setPhoneStatus("new");
                }
            } catch (err: any) {
                addLog(`[PHONE] ❌ Error: ${err.message}`);
                setPhoneStatus("idle");
            }
        }, 600);

        return () => clearTimeout(phoneTimer.current);
    }, [formData.visitor_phone]);

    // ── 4. Camera Automation ──────────────────────────────────────────────────
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const openCamera = async () => {
        addLog("[CAM] Starting...");
        setCapturedImage(null);
        setCameraError(null);
        setStatusMsg("Initializing Camera...");
        setStatusColor("bg-gray-600/80");

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: 640, height: 480 },
                audio: false
            });
            streamRef.current = stream;
            setIsCameraOpen(true);
            addLog("[CAM] ✅ Stream active");

            // Wait for video element to mount
            setTimeout(() => {
                const video = videoRef.current;
                if (video) {
                    video.srcObject = stream;
                    video.play().then(() => {
                        addLog("[CAM] ▶️ Playing");
                        startDetection();
                    }).catch(err => {
                        addLog(`[CAM] ❌ Play error: ${err.message}`);
                        setCameraError("Camera playback failed.");
                    });
                } else {
                    addLog("[CAM] ❌ videoRef is Null");
                }
            }, 300);
        } catch (err: any) {
            addLog(`[CAM] ❌ Access fail: ${err.message}`);
            setCameraError("Camera access denied. Please allow permissions.");
        }
    };

    const startDetection = () => {
        clearInterval(intervalRef.current);
        let tick = 0;
        console.log("[DET] Detection loop started");

        intervalRef.current = setInterval(async () => {
            const video = videoRef.current;
            if (!video || video.readyState < 2) return;

            tick++;
            const fapi = (window as any).faceapi;

            if (fapi && fapiReadyRef.current) {
                try {
                    const det = await fapi.detectSingleFace(
                        video,
                        new fapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 })
                    );

                    if (det) {
                        console.log("[DET] ✅ Face Found! Capturing...");
                        setStatusMsg("Face Detected! Capturing...");
                        setStatusColor("bg-emerald-500");
                        doCapture();
                    } else {
                        if (tick % 5 === 0) console.log("[DET] Scanning...");
                        setStatusMsg(`Scanning... (${tick})`);
                        setStatusColor("bg-blue-500/80");
                    }
                } catch (e) { console.error("[DET] AI Error:", e); }
            } else {
                // Fallback: Auto-capture after 4 seconds if AI models fail to load
                if (tick >= 10) {
                    console.log("[DET] 🕒 Timeout: Fallback capture");
                    doCapture();
                } else {
                    setStatusMsg(`AI Loading... (${10 - tick})`);
                    setStatusColor("bg-orange-500/80");
                }
            }
        }, 400);
    };

    const doCapture = () => {
        addLog("[CAP] Capturing image...");
        clearInterval(intervalRef.current);
        const video = videoRef.current;
        if (!video) {
            addLog("[CAP] ❌ No video element");
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            addLog("[CAP] ❌ Canvas context Null");
            return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const shot = canvas.toDataURL("image/jpeg", 0.9);

        addLog("[CAP] ✅ Image Saved");
        setCapturedImage(shot);
        setFormData(p => ({ ...p, visitor_image: shot }));
        setIsCameraOpen(false);
        stopCamera();
    };

    const retake = () => {
        setCapturedImage(null);
        openCamera();
    };

    // ── 5. Form Handlers ──────────────────────────────────────────────────────
    const handleChange = (e: any) =>
        setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/visitors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                router.push("/visitors");
                router.refresh();
            } else {
                alert("Error saving visitor log.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-muted-foreground"><Loader2 className="animate-spin h-8 w-8 mx-auto" /><p className="mt-4">Loading application...</p></div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-12">
            {/* System Status Banner */}
            <div className={cn(
                "p-2 text-center rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                jsStatus === 'active' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/10" : "bg-yellow-500 text-white animate-pulse"
            )}>
                {jsStatus === 'active' ? "✅ System Ready: Automation Enabled" : "🔄 Initializing System..."}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Add Visitor Log</h2>
                    <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
                        <ScanFace className="h-4 w-4" /> AI-Powered automated check-in
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => alert("Verification: JavaScript is running correctly.")}
                        className="px-4 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                    >
                        <Search className="h-3.5 w-3.5" /> Verify JS
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border shadow-xl shadow-gray-100 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" /> Visitor Name
                            </label>
                            <input
                                className="flex h-12 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-1 text-sm transition-all focus:border-primary focus:bg-white focus:outline-none"
                                name="visitor_name"
                                value={formData.visitor_name}
                                onChange={handleChange}
                                placeholder="Enter full name"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <Phone className="h-4 w-4 text-primary" /> Visitor Phone
                            </label>
                            <div className="relative">
                                <input
                                    className={cn(
                                        "flex h-12 w-full rounded-xl border-2 px-4 py-1 text-sm bg-slate-50 transition-all focus:bg-white focus:outline-none",
                                        phoneStatus === 'idle' && "border-slate-100",
                                        phoneStatus === 'checking' && "border-blue-400",
                                        phoneStatus === 'exists' && "border-red-500 ring-4 ring-red-500/10",
                                        phoneStatus === 'new' && "border-emerald-500 ring-4 ring-emerald-500/10",
                                    )}
                                    name="visitor_phone"
                                    value={formData.visitor_phone}
                                    onChange={handleChange}
                                    placeholder="Enter 10-digit number"
                                    maxLength={15}
                                    required
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    {phoneStatus === 'checking' && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
                                    {phoneStatus === 'exists' && <XCircle className="h-5 w-5 text-red-500" />}
                                    {phoneStatus === 'new' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                                </div>
                            </div>
                            {phoneStatus === 'exists' && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest pl-1">⚠ Returning Visitor (Number Exists)</p>}
                            {phoneStatus === 'new' && <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest pl-1">✓ New Visitor Registered</p>}
                        </div>
                    </div>

                    {/* Camera Section */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-700 block">Identity Verification <span className="text-xs font-normal text-muted-foreground">(Auto-Capture)</span></label>

                        <div className="relative aspect-video rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">

                            {capturedImage ? (
                                <div className="absolute inset-0 group">
                                    <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                                    <button
                                        type="button"
                                        onClick={retake}
                                        className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center rounded-full bg-white/90 shadow-lg text-gray-700 hover:bg-white transition-all transform hover:scale-110"
                                    >
                                        <RefreshCw className="h-5 w-5" />
                                    </button>
                                    <div className="absolute bottom-4 left-4 px-4 py-1.5 bg-emerald-500 text-white text-[10px] font-extrabold rounded-full uppercase tracking-widest flex items-center gap-2 shadow-xl">
                                        <CheckCircle2 className="h-4 w-4" /> Identity Verified
                                    </div>
                                </div>
                            ) : isCameraOpen ? (
                                <div className="absolute inset-0">
                                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />

                                    {/* HUD Overlay */}
                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                        <div className="w-48 h-64 rounded-[80px] border-4 border-white/30 border-dashed animate-[spin_15s_linear_infinite]" />
                                        <div className="absolute w-44 h-60 rounded-[75px] border-2 border-white/60" />
                                    </div>

                                    {/* Dynamic Status Tag */}
                                    <div className={cn(
                                        "absolute top-4 left-4 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md shadow-2xl z-20 flex items-center gap-2",
                                        statusColor
                                    )}>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        {statusMsg}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-6 p-12 text-center max-w-sm">
                                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <Camera className="h-10 w-10" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-lg font-bold text-gray-800 tracking-tight">AI Face Detection</p>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            The system will automatically recognize your face and capture a verified snapshot.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={openCamera}
                                        className="bg-primary text-primary-foreground px-10 py-3 rounded-full text-sm font-bold uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                                    >
                                        Open Camera
                                    </button>
                                    {cameraError && <p className="text-xs text-red-500 font-medium">{cameraError}</p>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Whom to Meet</label>
                            <select
                                className="flex h-12 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-1 text-sm focus:border-primary focus:bg-white focus:outline-none transition-all"
                                name="employee_id"
                                value={formData.employee_id}
                                onChange={e => {
                                    const emp = employees.find(x => x.id === e.target.value);
                                    setFormData({ ...formData, employee_id: e.target.value, whom_to_meet: emp?.name || "" });
                                }}
                                required
                            >
                                <option value="">Select Employee</option>
                                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Date & Time</label>
                            <input
                                type="datetime-local"
                                className="flex h-12 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-1 text-sm focus:border-primary focus:bg-white focus:outline-none transition-all"
                                name="check_in"
                                value={formData.check_in}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Purpose of Visit</label>
                        <textarea
                            className="flex min-h-[100px] w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none transition-all resize-none"
                            name="purpose"
                            value={formData.purpose}
                            onChange={handleChange}
                            placeholder="Briefly describe the reason for your visit..."
                            required
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-6">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-8 py-3 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-primary text-primary-foreground px-10 py-3 rounded-full text-sm font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 hover:shadow-2xl transition-all disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin h-5 w-5" /> : "Complete Check-in"}
                        </button>
                    </div>
                </form>
            </div>

            {/* ── LIVE DEBUG CONSOLE ── */}
            <div className="bg-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Live System Logs (Debug)
                    </span>
                    <button
                        onClick={() => setDebugLogs([])}
                        className="text-[9px] text-slate-500 hover:text-white uppercase font-bold"
                    >
                        Clear
                    </button>
                </div>
                <div className="space-y-1.5 font-mono">
                    {debugLogs.length === 0 && <p className="text-[10px] text-slate-600 italic">No system activity detected yet...</p>}
                    {debugLogs.map((log, i) => (
                        <p key={i} className={cn(
                            "text-[10px] border-l-2 pl-2 transition-all",
                            log.includes("❌") ? "text-red-400 border-red-500" :
                                log.includes("✅") ? "text-emerald-400 border-emerald-500" :
                                    "text-slate-300 border-slate-700"
                        )}>
                            {log}
                        </p>
                    ))}
                </div>
            </div>
        </div>
    );
}

