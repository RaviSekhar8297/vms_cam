"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/Toast";
import { Camera, X, RotateCcw, ClipboardList, CheckCheck, Loader2, ChevronRight, Search } from "lucide-react";
import { format } from "date-fns";
import Footer from "@/components/Footer";

const TARGET_ORG_ID = "ef154e18-a7c9-4ce4-a730-6cad9b816950";

function useWebcam() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [camError, setCamError] = useState<string | null>(null);
    const [isCamOn, setIsCamOn] = useState(false);

    useEffect(() => {
        if (isCamOn && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => { });
        }
    }, [isCamOn]);

    const startCamera = async () => {
        try {
            setCamError(null);
            const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
            streamRef.current = s;
            setIsCamOn(true);
        } catch {
            setCamError("Camera access denied. Please allow camera permission in your browser.");
        }
    };

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setIsCamOn(false);
        if (videoRef.current) videoRef.current.srcObject = null;
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0);
        }
        const photo = canvas.toDataURL("image/jpeg", 0.85);
        setCapturedPhoto(photo);
        stopCamera();
    };

    const retakePhoto = () => {
        setCapturedPhoto(null);
        startCamera();
    };

    return { videoRef, capturedPhoto, setCapturedPhoto, camError, isCamOn, startCamera, stopCamera, capturePhoto, retakePhoto };
}

export default function AVMSKioskPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    
    const [form, setForm] = useState({
        visitor_name: "",
        visitor_phone: "",
        whom_to_meet: "",
        purpose: "",
        employee_id: "",
    });
    
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const checkTheme = () =>
            setIsDark(document.documentElement.classList.contains("dark"));

        checkTheme();

        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    const webcam = useWebcam();

    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        // Fetch all users and filter by the requested organization ID
        fetch("/api/users")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setUsers(data); // Display all employees
                }
            })
            .catch(() => { });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newErrors: Record<string, string> = {};
        if (!form.visitor_name.trim()) newErrors.visitor_name = "Full Name is required";
        
        const phoneDigits = form.visitor_phone.replace(/\D/g, "");
        if (phoneDigits.length !== 10) newErrors.visitor_phone = "Valid 10-digit Mobile Number is required";
        
        if (!form.whom_to_meet.trim()) newErrors.whom_to_meet = "Please select whom to meet";
        if (!form.purpose) newErrors.purpose = "Please select visit purpose";
        if (!webcam.capturedPhoto) newErrors.photo = "Please capture a visitor selfie";

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            showToast("error", "Validation Failed", "Please check the highlighted fields.");
            return;
        }

        setSubmitting(true);
        try {
            // Save image to visitors_img folder for face recognition
            await fetch("/api/save-visitor-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: form.visitor_name, image: webcam.capturedPhoto }),
            });

            const res = await fetch("/api/visitors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, visitor_image: webcam.capturedPhoto, organization_id: TARGET_ORG_ID }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to add visitor");
            
            setSubmitSuccess(true);
            setForm({ visitor_name: "", visitor_phone: "", whom_to_meet: "", purpose: "", employee_id: "" });
            webcam.setCapturedPhoto(null);
            
            setTimeout(() => { 
                setSubmitSuccess(false); 
            }, 3000);
        } catch (err: any) {
            showToast("error", "Check-in failed", err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[500] bg-[#FAFAFA] dark:bg-slate-950 flex flex-col h-screen overflow-hidden font-sans">
            {/* Premium Header - Concierge Branding */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-b border-border/50 px-8 lg:px-12 py-6 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="h-14 w-44 relative flex items-center justify-center p-3 rounded-2xl bg-card border border-border/50 shadow-sm transition-colors">
                        <img src={isDark ? "/images/whitelogo.jpeg" : "/images/bluelogo.png"} alt="Anthea Logo" className="h-full w-full object-contain" />
                    </div>
                    <div className="h-10 w-[1px] bg-border/40 mx-2 lg:mx-4" />
                    <div>
                        <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight leading-none mb-1">
                            Visitor <span className="text-primary">Concierge</span>
                        </h1>
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Entry Terminal : AVMS</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    <div className="hidden md:flex flex-col items-end h-10 justify-center text-right border-border/50 pr-2">
                        <p className="text-xl font-bold text-foreground tabular-nums tracking-tighter leading-none mb-1">
                            {currentTime ? format(currentTime, "HH:mm") : "--:--"}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none opacity-80">
                            {currentTime ? format(currentTime, "EEEE, dd MMM yyyy") : "..."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content - Centered Registration Form */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/10 dark:bg-slate-900/10 p-8 lg:p-12 flex flex-col items-center">
                <div className="max-w-[72rem] mx-auto w-full">
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 h-full">
                        {submitSuccess ? (
                            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-10 text-center">
                                <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center relative">
                                    <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping" />
                                    <CheckCheck className="h-14 w-14 text-primary" />
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-5xl font-bold text-foreground uppercase tracking-tighter">Registration Complete</h2>
                                    <p className="text-base text-muted-foreground font-medium uppercase tracking-widest max-w-lg mx-auto">Your details have been successfully logged. Please proceed.</p>
                                </div>
                                <Button onClick={() => setSubmitSuccess(false)} className="h-16 px-12 rounded-2xl bg-primary text-primary-foreground font-bold uppercase tracking-widest text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Register New Visitor</Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                                {/* Left Side - Identity Capture */}
                                <div className="lg:col-span-5 space-y-8">
                                    <div className="bg-card border border-border/50 rounded-[2.5rem] p-10 shadow-sm flex flex-col gap-8">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Camera className="h-4 w-4 text-primary" />
                                            </div>
                                            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Face Intelligence Scan</h3>
                                        </div>

                                        <div className="aspect-[4/3] rounded-[2rem] overflow-hidden bg-muted border-4 border-card shadow-inner relative ring-1 ring-border/20">
                                            {webcam.capturedPhoto ? (
                                                <img src={webcam.capturedPhoto} alt="Captured" className="w-full h-full object-cover animate-in fade-in zoom-in-105" />
                                            ) : webcam.isCamOn ? (
                                                <video ref={webcam.videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-20">
                                                    <Camera className="h-16 w-16" />
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Standby</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-4">
                                            {!webcam.capturedPhoto && !webcam.isCamOn ? (
                                                <Button type="button" onClick={webcam.startCamera} className="flex-1 h-14 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[10px]">Capture Image</Button>
                                            ) : webcam.isCamOn ? (
                                                <Button type="button" onClick={webcam.capturePhoto} className="flex-1 h-14 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[10px]">Take Selfie</Button>
                                            ) : (
                                                <Button type="button" onClick={webcam.retakePhoto} variant="outline" className="flex-1 h-14 rounded-xl border border-border font-bold uppercase tracking-widest text-[10px]">Retake Image</Button>
                                            )}
                                        </div>
                                        {errors.photo && <span className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-1 block text-center">{errors.photo}</span>}
                                    </div>
                                </div>

                                {/* Right Side - Entry Credentials */}
                                <div className="lg:col-span-7 space-y-8 text-left">
                                    <div className="bg-card border border-border/50 rounded-[2.5rem] p-10 shadow-sm flex flex-col gap-10">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                                <ClipboardList className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Visitor Credentials</h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Full Name <span className="text-rose-500">*</span></label>
                                                <input 
                                                    value={form.visitor_name}
                                                    onChange={e => {
                                                        setForm(f => ({ ...f, visitor_name: e.target.value }));
                                                        if (errors.visitor_name) setErrors(err => ({ ...err, visitor_name: "" }));
                                                    }}
                                                    className={`w-full bg-muted/40 border ${errors.visitor_name ? "border-rose-500" : "border-border/50"} rounded-2xl px-6 py-4 text-base font-bold focus:bg-card focus:border-primary/40 transition-all outline-none text-foreground placeholder:text-muted-foreground/30 uppercase`}
                                                    placeholder="FULL NAME"
                                                />
                                                {errors.visitor_name && <span className="text-rose-500 text-[10px] font-bold uppercase tracking-widest pl-1 block">{errors.visitor_name}</span>}
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Mobile Number <span className="text-rose-500">*</span></label>
                                                <input 
                                                    value={form.visitor_phone}
                                                    maxLength={10}
                                                    onChange={e => {
                                                        setForm(f => ({ ...f, visitor_phone: e.target.value.replace(/\D/g, "") }));
                                                        if (errors.visitor_phone) setErrors(err => ({ ...err, visitor_phone: "" }));
                                                    }}
                                                    className={`w-full bg-muted/40 border ${errors.visitor_phone ? "border-rose-500" : "border-border/50"} rounded-2xl px-6 py-4 text-base font-bold focus:bg-card focus:border-primary/40 transition-all outline-none text-foreground placeholder:text-muted-foreground/30`}
                                                    placeholder="10-DIGIT NUMBER"
                                                />
                                                {errors.visitor_phone && <span className="text-rose-500 text-[10px] font-bold uppercase tracking-widest pl-1 block">{errors.visitor_phone}</span>}
                                            </div>
                                        </div>

                                        <div className="space-y-3 relative">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Whom To Meet <span className="text-rose-500">*</span></label>
                                            <div className="relative">
                                                <input 
                                                    value={userSearchQuery || form.whom_to_meet}
                                                    onFocus={() => setShowUserDropdown(true)}
                                                    onChange={e => {
                                                        setUserSearchQuery(e.target.value);
                                                        setForm(f => ({ ...f, whom_to_meet: e.target.value }));
                                                        setShowUserDropdown(true);
                                                        if (errors.whom_to_meet) setErrors(err => ({ ...err, whom_to_meet: "" }));
                                                    }}
                                                    className={`w-full bg-muted/40 border ${errors.whom_to_meet ? "border-rose-500" : "border-border/50"} rounded-2xl px-6 py-5 text-lg font-bold focus:bg-card focus:border-primary/40 transition-all outline-none text-foreground placeholder:text-muted-foreground/30 uppercase`}
                                                    placeholder="SEARCH STAFF NAME"
                                                />
                                                <Search className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40" />
                                            </div>
                                            {errors.whom_to_meet && <span className="text-rose-500 text-[10px] font-bold uppercase tracking-widest pl-1 block">{errors.whom_to_meet}</span>}
                                            {showUserDropdown && (
                                                <div className="absolute z-50 w-full mt-2 bg-card border border-border shadow-2xl rounded-2xl max-h-56 overflow-auto animate-in fade-in slide-in-from-top-2">
                                                    {users.filter(u => u.name?.toLowerCase().includes((userSearchQuery || "").toLowerCase()) || u.org_name?.toLowerCase().includes((userSearchQuery || "").toLowerCase())).map(u => (
                                                        <button key={u.id} type="button" onClick={() => { setForm(f => ({ ...f, whom_to_meet: u.name, employee_id: u.id })); setUserSearchQuery(u.name); setShowUserDropdown(false); }} className="w-full px-6 py-4 text-left hover:bg-muted flex items-center justify-between border-b last:border-0 border-border/20 group transition-colors">
                                                            <div>
                                                                <p className="font-bold text-sm uppercase text-foreground group-hover:text-primary transition-colors">{u.name}</p>
                                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{u.role} {u.org_name ? `• ${u.org_name}` : ""}</p>
                                                            </div>
                                                            <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary transition-all" />
                                                        </button>
                                                    ))}
                                                    {users.filter(u => u.name?.toLowerCase().includes((userSearchQuery || "").toLowerCase()) || u.org_name?.toLowerCase().includes((userSearchQuery || "").toLowerCase())).length === 0 && (
                                                        <div className="p-4 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">No staff found</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mb-4">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Access Channel (Purpose) <span className="text-rose-500">*</span></label>
                                                <select 
                                                    value={form.purpose}
                                                    onChange={e => {
                                                        setForm(f => ({ ...f, purpose: e.target.value }));
                                                        if (errors.purpose) setErrors(err => ({ ...err, purpose: "" }));
                                                    }}
                                                    className={`w-full bg-muted/40 border ${errors.purpose ? "border-rose-500" : "border-border/50"} rounded-2xl px-6 py-4 text-sm font-bold focus:bg-card focus:border-primary/40 transition-all outline-none text-foreground uppercase`}
                                                >
                                                    <option value="">Select purpose...</option>
                                                    <option value="Business Meeting">Business Meeting</option>
                                                    <option value="Interview">Interview</option>
                                                    <option value="Delivery">Delivery</option>
                                                    <option value="Client Visit">Client Visit</option>
                                                    <option value="Personal">Personal</option>
                                                    <option value="Maintenance">Maintenance</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                                {errors.purpose && <span className="text-rose-500 text-[10px] font-bold uppercase tracking-widest pl-1 block">{errors.purpose}</span>}
                                            </div>
                                        </div>

                                        <Button 
                                            type="submit" 
                                            disabled={submitting}
                                            className="w-full h-16 mt-4 rounded-2xl bg-foreground text-card font-bold uppercase text-base tracking-widest shadow-xl transition-all active:scale-[0.98]"
                                        >
                                            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit"}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
            <Footer className="py-2 shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-t border-border/30" />
        </div>
    );
}
