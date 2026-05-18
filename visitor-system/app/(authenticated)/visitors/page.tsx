"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/Toast";
import {
    LayoutDashboard, Users, Building, BookOpen, Search, Filter,
    Camera, X, RotateCcw, UserPlus, ClipboardList,
    User, Phone, Target, Pencil,
    CheckCheck, AlertCircle, Loader2, ChevronLeft, ChevronRight,
    List as ListIcon, Table2, LayoutGrid, GanttChartSquare, Clock, CheckCircle, CheckCircle2,
    FileSpreadsheet, Download, Trash2, Printer, Maximize2, Minimize2
} from "lucide-react";
import {
    format, differenceInMinutes, startOfDay, subDays, isAfter,
    isSameDay, subWeeks, subMonths
} from "date-fns";
import * as XLSX from "xlsx";
import { DatePicker } from "@/components/ui/datepicker";

const VIEWS = [
    { id: "table", label: "Table", icon: Table2 },
    { id: "list", label: "List", icon: ListIcon },
    { id: "kanban", label: "Kanban", icon: LayoutGrid },
    { id: "gantt", label: "Gantt", icon: GanttChartSquare },
] as const;

type ViewId = "table" | "list" | "kanban" | "gantt";

const PAGE_SIZE = 10;


// ─── Types ───────────────────────────────────────────────────────────────────
type Visitor = {
    id: string;
    visitor_name: string;
    visitor_phone: string;
    whom_to_meet: string;
    purpose: string;
    org_name: string;
    organization_id?: string;
    check_in: string;
    check_out?: string;
    status: string;
    visitor_image?: string;
};

// ─── Tab Components ───────────────────────────────────────────────────────────
const TABS = [
    { id: "log", label: "Visitor Log", icon: ClipboardList },
    { id: "add", label: "Add Visitor", icon: UserPlus },
];

// ─── Webcam Hook ─────────────────────────────────────────────────────────────
function useWebcam() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [camError, setCamError] = useState<string | null>(null);
    const [isCamOn, setIsCamOn] = useState(false);

    // Attach stream to video element whenever isCamOn changes
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
            ctx.scale(-1, 1); // un-mirror for actual photo
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

// ─── Log Table View ─────────────────────────────────────────────────────────
function LogTableView({ visitors, onEdit, onDelete, onPrint, onCheckout, setPhotoPreview, currSession, loading }: any) {
    return (
        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin relative">
            <table className="w-full text-sm text-left relative font-medium tracking-tight">
                <thead className="text-[11px] text-muted-foreground/70 uppercase font-bold tracking-widest bg-muted/90 backdrop-blur-md border-b border-border/40 sticky top-0 z-10 shadow-sm leading-none">
                    <tr>
                        <th className="px-6 py-4 font-semibold">Visitor</th>
                        <th className="px-6 py-4 font-semibold hidden md:table-cell">Whom to Meet</th>
                        <th className="px-6 py-4 font-semibold hidden lg:table-cell text-center">Purpose</th>
                        <th className="px-6 py-4 font-semibold">Check-In</th>
                        <th className="px-6 py-4 font-semibold">Check-Out</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold text-right pr-6">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {loading ? (
                        <tr><td colSpan={7} className="px-6 py-16 text-center">
                            <div className="flex justify-center items-center gap-3">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                <span className="text-muted-foreground">Loading...</span>
                            </div>
                        </td></tr>
                    ) : visitors.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center gap-4 py-10 opacity-40">
                                <BookOpen className="h-10 w-10 text-muted-foreground" />
                                <p className="font-bold text-xs uppercase tracking-widest">No Records Found</p>
                            </div>
                        </td></tr>
                    ) : visitors.map((v: any) => (
                        <tr key={v.id} className="hover:bg-muted/10 transition-all duration-300 group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    {v.visitor_image ? (
                                        <img src={v.visitor_image} alt={v.visitor_name} onClick={() => setPhotoPreview({ src: v.visitor_image!, name: v.visitor_name })} className="h-10 w-10 rounded-xl object-cover border border-border shrink-0 shadow-sm cursor-pointer hover:opacity-80 transition-opacity" />
                                    ) : (
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                                            {v.visitor_name?.charAt(0)?.toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-black text-sm text-foreground tracking-tight truncate uppercase leading-none mb-1">{v.visitor_name}</p>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">{v.visitor_phone}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 hidden md:table-cell font-bold text-xs uppercase text-slate-500 whitespace-nowrap">{v.whom_to_meet || "—"}</td>
                            <td className="px-6 py-4 hidden lg:table-cell text-muted-foreground text-[10px] font-black uppercase text-center">{v.purpose || "—"}</td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col gap-0.5 text-[10px] font-black uppercase text-slate-800">
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="h-3 w-3 text-emerald-500" />
                                        {v.check_in ? format(new Date(v.check_in), "HH:mm") : "—"}
                                    </span>
                                    <span className="text-slate-400 pl-4.5">{v.check_in ? format(new Date(v.check_in), "dd MMM") : ""}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col gap-0.5 text-[10px] font-black uppercase">
                                    {v.check_out ? (
                                        <>
                                            <span className="flex items-center gap-1.5 text-slate-500">
                                                <CheckCircle className="h-3 w-3 text-slate-400" />
                                                {format(new Date(v.check_out), "HH:mm")}
                                            </span>
                                            <span className="text-slate-400 pl-4.5">{format(new Date(v.check_out), "dd MMM")}</span>
                                        </>
                                    ) : (
                                        <span className="text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-100">STILL IN</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] uppercase font-black border ${v.status === "CHECKED_OUT"
                                    ? "bg-slate-50 text-slate-500 border-slate-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    }`}>
                                    <span className={`h-1 w-1 rounded-full ${v.status === "CHECKED_OUT" ? "bg-slate-300" : "bg-emerald-500 animate-pulse"}`} />
                                    {v.status === "CHECKED_OUT" ? "Exited" : "In Premises"}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {["RECEPTIONIST", "ADMIN", "SUPERADMIN"].includes(currSession?.role) && (
                                        <>
                                            {v.status !== "CHECKED_OUT" && (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => onCheckout(v.id)} title="Check out">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => onPrint(v)} title="Print Badge">
                                                <Printer className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50" onClick={() => onEdit(v)} title="Edit">
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            {["ADMIN", "SUPERADMIN"].includes(currSession?.role) && (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600 hover:bg-rose-50" onClick={() => onDelete(v)} title="Delete">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Log List View ──────────────────────────────────────────────────────────
function LogListView({ visitors, onEdit, onDelete, onPrint, onCheckout, setPhotoPreview, currSession }: any) {
    if (visitors.length === 0) return <div className="py-20 text-center text-muted-foreground uppercase font-black tracking-[0.3em] opacity-20">No Visitors Found</div>;
    return (
        <div className="flex-1 min-h-0 divide-y divide-border/40 overflow-y-auto scrollbar-thin">
            {visitors.map((v: any) => (
                <div key={v.id} className="flex items-center gap-5 px-6 py-5 hover:bg-muted/5 transition-all group">
                    <div className="relative">
                        {v.visitor_image ? (
                            <img src={v.visitor_image} alt={v.visitor_name} onClick={() => setPhotoPreview({ src: v.visitor_image!, name: v.visitor_name })} className="h-14 w-14 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-lg cursor-pointer hover:scale-105 transition-transform" />
                        ) : (
                            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs border-2 border-white">{v.visitor_name?.charAt(0)?.toUpperCase()}</div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-slate-800 ${v.status === "CHECKED_OUT" ? "bg-slate-300" : "bg-emerald-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-base text-slate-800 dark:text-white truncate uppercase tracking-tight mb-0.5">{v.visitor_name}</p>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {v.visitor_phone}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {v.whom_to_meet || "GUEST"}</span>
                        </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-1 px-8 border-x border-slate-100 dark:border-slate-800 h-10 justify-center">
                        <span className="text-sm font-black text-slate-800 dark:text-white tabular-nums">{v.check_in ? format(new Date(v.check_in), "HH:mm") : "—"}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Arrival</span>
                    </div>
                    <div className="flex items-center gap-2">
                         {["RECEPTIONIST", "ADMIN", "SUPERADMIN"].includes(currSession?.role) && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                                {v.status !== "CHECKED_OUT" && <Button size="icon" variant="ghost" className="h-10 w-10 text-emerald-600 rounded-xl" onClick={() => onCheckout(v.id)}><CheckCircle2 className="h-5 w-5" /></Button>}
                                <Button size="icon" variant="ghost" className="h-10 w-10 text-blue-600 rounded-xl" onClick={() => onPrint(v)}><Printer className="h-5 w-5" /></Button>
                                <Button size="icon" variant="ghost" className="h-10 w-10 text-indigo-600 rounded-xl" onClick={() => onEdit(v)}><Pencil className="h-4 w-4" /></Button>
                            </div>
                        )}
                        <div className={`text-[10px] px-4 py-2 rounded-xl font-[900] uppercase tracking-widest border ${v.status === "CHECKED_OUT" ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-500/10"}`}>
                            {v.status === "CHECKED_OUT" ? "OUT" : "LIVE"}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Log Kanban View ────────────────────────────────────────────────────────
function LogKanbanView({ visitors, onEdit, onDelete, onPrint, onCheckout, setPhotoPreview }: any) {
    const inPremises = visitors.filter((v: any) => v.status !== "CHECKED_OUT");
    const checkedOut = visitors.filter((v: any) => v.status === "CHECKED_OUT");

    return (
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2 bg-emerald-50 dark:bg-emerald-500/5 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/10">
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/40" /> Active Visitors
                    </h3>
                    <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full">{inPremises.length}</span>
                </div>
                <div className="space-y-4">
                    {inPremises.length === 0 && <div className="text-center py-10 text-slate-300 font-black uppercase text-[10px] tracking-widest border-2 border-dashed rounded-[2rem]">Empty Sector</div>}
                    {inPremises.map((v: any) => (
                        <div key={v.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-1 transition-all group overflow-hidden relative">
                            {/* Accent stripe */}
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500" />
                            <div className="flex items-center gap-5">
                                {v.visitor_image ? (
                                    <img src={v.visitor_image} alt={v.visitor_name} onClick={() => setPhotoPreview({ src: v.visitor_image!, name: v.visitor_name })} className="h-16 w-16 rounded-2xl object-cover shrink-0 cursor-pointer border-2 border-slate-50" />
                                ) : (
                                    <div className="h-16 w-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-lg">{v.visitor_name?.charAt(0)?.toUpperCase()}</div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-base uppercase tracking-tight text-slate-800 dark:text-white leading-none mb-2">{v.visitor_name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.visitor_phone}</p>
                                </div>
                            </div>
                            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">MEETING WITH</p>
                                    <p className="text-xs font-black text-slate-600 uppercase">{v.whom_to_meet || "GUEST"}</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Button size="icon" variant="ghost" className="h-10 w-10 text-blue-600" onClick={() => onPrint(v)}><Printer className="h-5 w-5" /></Button>
                                    <Button size="sm" variant="outline" className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 px-4 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all" onClick={() => onCheckout(v.id)}>Secure Exit</Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Checked Out column */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200">
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Exit Protocol (Log)</h3>
                    <span className="bg-slate-200 text-slate-600 text-[10px] font-black px-3 py-1 rounded-full">{checkedOut.length}</span>
                </div>
                <div className="space-y-3 opacity-60">
                    {checkedOut.slice(0, 10).map((v: any) => (
                        <div key={v.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-white dark:border-slate-800 p-4 grayscale shadow-sm flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                 <span className="h-6 w-6 rounded-lg bg-white flex items-center justify-center text-[10px] font-black text-slate-400 border">{v.visitor_name?.charAt(0)?.toUpperCase()}</span>
                                 <p className="font-black text-xs uppercase tracking-tight text-slate-600">{v.visitor_name}</p>
                             </div>
                             <div className="text-right">
                                 <p className="font-black text-[10px] text-slate-400 tabular-nums uppercase">{v.check_out ? format(new Date(v.check_out), "HH:mm") : ""}</p>
                             </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Visitors() {
    const [activeTab, setActiveTab] = useState("log");
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [view, setView] = useState<ViewId>("table");
    const [editVisitor, setEditVisitor] = useState<Visitor | null>(null);
    const [deleteVisitor, setDeleteVisitor] = useState<Visitor | null>(null);
    const [fromDate, setFromDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
    const [toDate, setToDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
    const [photoPreview, setPhotoPreview] = useState<{ src: string, name: string } | null>(null);
    const [printVisitor, setPrintVisitor] = useState<Visitor | null>(null);

    // Add Visitor form state
    const [form, setForm] = useState({
        visitor_name: "",
        visitor_phone: "",
        whom_to_meet: "",
        purpose: "",
        employee_id: "",
    });
    const [users, setUsers] = useState<any[]>([]);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [currSession, setCurrSession] = useState<any>(null);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
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

    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const toggleFullScreenMode = async (enter: boolean) => {
        setIsFullScreen(enter);
        try {
            if (enter && document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            } else if (!enter && document.fullscreenElement) {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error("Fullscreen API error:", err);
        }
    };

    const webcam = useWebcam();

    const fetchSession = useCallback(() => {
        fetch("/api/auth/me").then(r => r.json())
            .then(data => setCurrSession(data.user?.user || data.user))
            .catch(() => { });
    }, []);

    const fetchVisitors = useCallback(() => {
        setLoading(true);
        fetch("/api/visitors")
            .then((res) => res.json())
            .then((data) => {
                setVisitors(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchVisitors();
        fetchSession();
        fetch("/api/users?all=true")
            .then(res => res.json())
            .then(data => setUsers(Array.isArray(data) ? data : []))
            .catch(() => { });
    }, [fetchVisitors, fetchSession]);

    // Stop camera when switching tabs
    useEffect(() => {
        if (activeTab !== "add") webcam.stopCamera();
    }, [activeTab]);

    const handleCheckout = async (id: string) => {
        try {
            const res = await fetch(`/api/visitors/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "CHECKED_OUT", check_out: new Date().toISOString() })
            });
            if (!res.ok) throw new Error("Failed to check out");
            showToast("success", "Checked out successfully", "Visitor has been checked out.");
            fetchVisitors();
        } catch (err: any) {
            showToast("error", "Check-out failed", err.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.visitor_name.trim()) { showToast("error", "Name required", "Please enter visitor name."); return; }
        const phoneDigits = form.visitor_phone.replace(/\D/g, "");
        if (phoneDigits.length !== 10) { showToast("error", "Invalid Phone", "Please enter exactly 10 digits."); return; }
        if (!form.whom_to_meet.trim()) { showToast("error", "Whom to meet required", "Please select or enter whom to meet."); return; }
        if (!form.purpose) { showToast("error", "Purpose required", "Please select visit purpose."); return; }
        if (!webcam.capturedPhoto) { showToast("error", "Photo required", "Please capture a visitor selfie."); return; }

        setSubmitting(true);
        setSubmitError("");
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
                body: JSON.stringify({ ...form, visitor_image: webcam.capturedPhoto }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to add visitor");
            showToast("success", "Visitor Checked In!", `${form.visitor_name} has been registered.`);
            setSubmitSuccess(true);
            setForm({ visitor_name: "", visitor_phone: "", whom_to_meet: "", purpose: "", employee_id: "" });
            webcam.setCapturedPhoto(null);
            fetchVisitors();
            setTimeout(() => { setSubmitSuccess(false); setActiveTab("log"); }, 2000);
        } catch (err: any) {
            setSubmitError(err.message);
            showToast("error", "Check-in failed", err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleExportExcel = () => {
        if (filteredVisitors.length === 0) {
            showToast("error", "No data to export");
            return;
        }

        const exportData = filteredVisitors.map(v => ({
            "Visitor Name": v.visitor_name,
            "Phone": v.visitor_phone,
            "Whom to Meet": v.whom_to_meet,
            "Purpose": v.purpose,
            "Organization": v.org_name,
            "Check-In": v.check_in ? format(new Date(v.check_in), "yyyy-MM-dd HH:mm:ss") : "—",
            "Check-Out": v.check_out ? format(new Date(v.check_out), "yyyy-MM-dd HH:mm:ss") : "—",
            "Status": v.status === "CHECKED_OUT" ? "Checked Out" : "In Premises"
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Visitors");

        const fileName = `Visitors_${fromDate}_to_${toDate}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showToast("success", "Exported successfully", fileName);
    };

    const handlePrint = (v: Visitor) => {
        setPrintVisitor(v);
    };

    // Print when visitor state is set
    useEffect(() => {
        if (printVisitor) {
            // Further increased timeout to ensure complex layout is fully ready
            const timer = setTimeout(() => {
                window.print();
                setPrintVisitor(null);
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [printVisitor]);

    const filteredVisitors = visitors.filter(v => {
        const matchesSearch = v.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.visitor_phone?.includes(searchQuery) ||
            v.whom_to_meet?.toLowerCase().includes(searchQuery.toLowerCase());

        // RBAC Checks
        let isAuthorized = false;
        if (currSession?.role === "SUPERADMIN") isAuthorized = true;
        else if (currSession?.role === "EMPLOYEE") {
            isAuthorized = v.whom_to_meet === currSession.name;
        } else {
            isAuthorized = v.organization_id === currSession?.organization_id;
        }

        if (!isAuthorized || !matchesSearch) return false;

        // Time Filter
        const checkInDate = v.check_in ? new Date(v.check_in) : null;
        if (!checkInDate) return false;

        if (fromDate) {
            const from = startOfDay(new Date(fromDate));
            if (checkInDate < from) return false;
        }

        if (toDate) {
            const to = startOfDay(new Date(toDate));
            to.setHours(23, 59, 59, 999);
            if (checkInDate > to) return false;
        }

        return true;
    });
    const totalPages = Math.max(1, Math.ceil(filteredVisitors.length / PAGE_SIZE));
    const pagedVisitors = filteredVisitors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500 overflow-hidden relative">
            {/* Page Header */}
            <div className="bg-card p-3 lg:p-4 rounded-2xl border shadow-sm shrink-0">
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-emerald-500" />
                    Visitors Management
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                    Log new visitor check-ins and view all visitor records.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex-1 min-h-0 bg-card rounded-2xl border shadow-sm overflow-hidden flex flex-col">
                {/* Tab Bar */}
                <div className="flex border-b bg-muted/20">
                    {TABS.filter(tab => {
                        if (tab.id === "add") return ["RECEPTIONIST", "ADMIN", "SUPERADMIN"].includes(currSession?.role);
                        return true; // Everyone can see the log
                    }).map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <div
                                key={tab.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setActiveTab(tab.id)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        setActiveTab(tab.id);
                                    }
                                }}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold tracking-wide transition-all border-b-2 cursor-pointer ${isActive
                                    ? "border-primary text-primary bg-primary/5"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                                {tab.id === "add" && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFullScreenMode(true);
                                        }}
                                        className="ml-2 p-1.5 rounded-full hover:bg-primary/20 transition-all text-primary/60 hover:text-primary group/fullscreen shadow-none border-none bg-transparent"
                                        title="Kiosk Mode"
                                    >
                                        <Maximize2 className="h-3 w-3 group-hover/fullscreen:scale-125 transition-transform" />
                                    </button>
                                )}
                                {tab.id === "log" && visitors.length > 0 && (
                                    <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                        {visitors.length}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ── TAB: Visitor Log ────────────────────────────── */}
                {activeTab === "log" && (
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        <div className="p-4 border-b flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-muted/10 shrink-0">
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 min-w-[200px] max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        placeholder="Search visitors..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Date range filter */}
                                <div className="flex items-center gap-0 bg-background border border-border/40 rounded-xl shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 group/date">
                                    <DatePicker
                                        date={fromDate}
                                        onChange={setFromDate}
                                        maxDate={new Date()}
                                        label="Starting From"
                                    />
                                    <div className="w-[1px] h-10 bg-border/30"></div>
                                    <DatePicker
                                        date={toDate}
                                        onChange={setToDate}
                                        maxDate={new Date()}
                                        label="Ending At"
                                        align="right"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExportExcel}
                                    className="rounded-lg h-9 gap-2 text-xs font-semibold hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                                >
                                    <FileSpreadsheet className="h-4 w-4" /> Export Excel
                                </Button>

                                {/* View Switcher */}
                                <div className="flex items-center bg-muted rounded-xl p-1 gap-1">
                                    {VIEWS.map(v => {
                                        const Icon = v.icon;
                                        const isActive = view === v.id;
                                        return (
                                            <button key={v.id} onClick={() => setView(v.id as ViewId)}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${isActive
                                                    ? "bg-background text-foreground shadow-sm border"
                                                    : "text-muted-foreground hover:text-foreground"
                                                    }`}>
                                                <Icon className="h-3.5 w-3.5" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {!loading && view === "list" && (
                            <LogListView visitors={pagedVisitors} onEdit={setEditVisitor} onDelete={setDeleteVisitor} onPrint={handlePrint} onCheckout={handleCheckout} setPhotoPreview={setPhotoPreview} currSession={currSession} />
                        )}

                        {!loading && view === "kanban" && (
                            <LogKanbanView visitors={filteredVisitors} onEdit={setEditVisitor} onDelete={setDeleteVisitor} onPrint={handlePrint} onCheckout={handleCheckout} setPhotoPreview={setPhotoPreview} />
                        )}

                        {!loading && view === "gantt" && (
                            <div className="flex-1 min-h-0 overflow-auto p-6 scrollbar-thin">
                                <GanttView visitors={filteredVisitors} onPrint={handlePrint} />
                            </div>
                        )}

                        {!loading && view === "table" && (
                            <LogTableView visitors={pagedVisitors} onEdit={setEditVisitor} onDelete={setDeleteVisitor} onPrint={handlePrint} onCheckout={handleCheckout} setPhotoPreview={setPhotoPreview} currSession={currSession} loading={loading} />
                        )}

                        {/* Pagination */}
                        {view === "table" && filteredVisitors.length > PAGE_SIZE && (
                            <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/10 shrink-0">
                                <span className="text-xs text-muted-foreground">
                                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredVisitors.length)} of {filteredVisitors.length}
                                </span>
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                                        <button key={pg} onClick={() => setPage(pg)}
                                            className={`h-7 w-7 rounded-lg text-xs font-semibold transition-all ${pg === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                                            {pg}
                                        </button>
                                    ))}
                                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Lightbox / Image Preview Modal */}
                {photoPreview && (
                    <PhotoModal
                        src={photoPreview.src}
                        name={photoPreview.name}
                        onClose={() => setPhotoPreview(null)}
                    />
                )}
                {/* ── TAB: Add Visitor ────────────────────────────── */}
                {activeTab === "add" && !isFullScreen && (
                    <div className="flex-1 min-h-0 p-4 lg:p-6 overflow-y-auto scrollbar-thin">
                        {submitSuccess ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                                    <CheckCheck className="h-10 w-10 text-emerald-500" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground uppercase tracking-tight">Visitor Checked In!</h3>
                                <p className="text-muted-foreground">Switching to visitor log...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* LEFT: Webcam capture */}
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <h3 className="text-base font-bold text-foreground uppercase tracking-tight">Visitor Photo</h3>
                                            <p className="text-sm text-muted-foreground mt-0.5">Take a live selfie for identification.</p>
                                        </div>

                                        <div className="flex items-center justify-center p-4">
                                            <div className="relative w-full aspect-video rounded-2xl border-4 border-dashed border-primary/20 p-2 bg-gradient-to-b from-muted/30 to-muted/10 shadow-inner flex items-center justify-center overflow-hidden transition-all duration-500 hover:border-primary/40">
                                                <div className="w-full h-full rounded-xl overflow-hidden border-4 border-background shadow-2xl relative">
                                                    {webcam.capturedPhoto ? (
                                                        <>
                                                            <img src={webcam.capturedPhoto} alt="Captured photo" onClick={() => setPhotoPreview({ src: webcam.capturedPhoto!, name: form.visitor_name })} className="w-full h-full object-cover animate-in fade-in zoom-in duration-300 cursor-pointer hover:opacity-90" />
                                                        </>
                                                    ) : webcam.isCamOn ? (
                                                        <video
                                                            ref={webcam.videoRef}
                                                            autoPlay
                                                            playsInline
                                                            muted
                                                            className="w-full h-full object-cover scale-x-[-1]"
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-full bg-muted/40 text-muted-foreground/40">
                                                            <Camera className="h-12 w-12 mb-2 opacity-20" />
                                                            <p className="text-[10px] font-bold uppercase tracking-widest">Camera Off</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {webcam.camError && (
                                            <div className="flex items-center gap-2 text-sm text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-lg px-4 py-3 border border-rose-200 dark:border-rose-500/20">
                                                <AlertCircle className="h-4 w-4 shrink-0" />
                                                {webcam.camError}
                                            </div>
                                        )}

                                        <div className="flex gap-4 max-w-sm mx-auto w-full">
                                            {!webcam.capturedPhoto && !webcam.isCamOn && (
                                                <Button type="button" onClick={webcam.startCamera} className="flex-1 rounded-2xl h-12 gap-3 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95">
                                                    <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                                                        <Camera className="h-4 w-4" />
                                                    </div>
                                                    Open Camera
                                                </Button>
                                            )}
                                            {webcam.isCamOn && (
                                                <>
                                                    <Button type="button" onClick={webcam.capturePhoto} className="flex-1 rounded-2xl h-12 gap-3 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 text-white font-bold active:scale-95 transition-all">
                                                        <Camera className="h-4 w-4" /> Capture Selfie
                                                    </Button>
                                                    <Button type="button" onClick={webcam.stopCamera} variant="outline" className="h-12 w-12 rounded-2xl border-2 hover:bg-muted font-bold">
                                                        <X className="h-5 w-5" />
                                                    </Button>
                                                </>
                                            )}
                                            {webcam.capturedPhoto && (
                                                <Button type="button" onClick={webcam.retakePhoto} variant="outline" className="flex-1 rounded-2xl h-12 gap-3 border-2 font-bold hover:bg-muted active:scale-95 transition-all">
                                                    <RotateCcw className="h-4 w-4" /> Retake Photo
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* RIGHT: Form fields */}
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <h3 className="text-base font-bold text-foreground">Visitor Information</h3>
                                            <p className="text-sm text-muted-foreground mt-0.5">Fill in the visitor's details below.</p>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Visitor Name */}
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-tight">
                                                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    placeholder="e.g. RAVI KUMAR"
                                                    value={form.visitor_name}
                                                    onChange={e => setForm(f => ({ ...f, visitor_name: e.target.value }))}
                                                    className="w-full px-4 py-2.5 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow uppercase font-medium"
                                                />
                                            </div>

                                            {/* Phone */}
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-tight">
                                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    placeholder="+91 9876543210"
                                                    value={form.visitor_phone}
                                                    onChange={e => setForm(f => ({ ...f, visitor_phone: e.target.value }))}
                                                    className="w-full px-4 py-2.5 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                                                />
                                            </div>

                                            {/* Whom to meet */}
                                            <div className="space-y-1.5 relative">
                                                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-tight">
                                                    <Target className="h-3.5 w-3.5 text-muted-foreground" /> Whom To Meet <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    placeholder="Search employee or enter name..."
                                                    value={userSearchQuery || form.whom_to_meet}
                                                    onFocus={() => setShowUserDropdown(true)}
                                                    onChange={e => {
                                                        setUserSearchQuery(e.target.value);
                                                        setForm(f => ({ ...f, whom_to_meet: e.target.value }));
                                                        setShowUserDropdown(true);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow uppercase font-medium"
                                                />
                                                {showUserDropdown && (
                                                    <div className="absolute z-50 w-full mt-1 bg-card border rounded-xl shadow-xl max-h-48 overflow-y-auto overflow-hidden">
                                                        {users.filter(u =>
                                                            u.organization_id === currSession?.organization_id && (
                                                                u.name?.toLowerCase().includes((userSearchQuery || "").toLowerCase()) ||
                                                                u.org_name?.toLowerCase().includes((userSearchQuery || "").toLowerCase())
                                                            )
                                                        ).length > 0 ? (
                                                            users.filter(u =>
                                                                u.organization_id === currSession?.organization_id && (
                                                                    u.name?.toLowerCase().includes((userSearchQuery || "").toLowerCase()) ||
                                                                    u.org_name?.toLowerCase().includes((userSearchQuery || "").toLowerCase())
                                                                )
                                                            ).map(u => (
                                                                <button
                                                                    key={u.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setForm(f => ({ ...f, whom_to_meet: u.name, employee_id: u.id }));
                                                                        setUserSearchQuery(u.name);
                                                                        setShowUserDropdown(false);
                                                                    }}
                                                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors border-b last:border-0 flex items-center justify-between"
                                                                >
                                                                    <div>
                                                                        <p className="font-semibold text-foreground uppercase">{u.name}</p>
                                                                        <p className="text-[10px] text-muted-foreground uppercase">{u.role} {u.org_name ? `• ${u.org_name}` : ""}</p>
                                                                    </div>
                                                                </button>
                                                            ))
                                                        ) : userSearchQuery ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowUserDropdown(false)}
                                                                className="w-full px-4 py-2.5 text-left text-sm text-muted-foreground italic"
                                                            >
                                                                Use custom name: "{userSearchQuery.toUpperCase()}"
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                )}
                                                {/* Backdrop for closing dropdown */}
                                                {showUserDropdown && (
                                                    <div className="fixed inset-0 z-40" onClick={() => setShowUserDropdown(false)} />
                                                )}
                                            </div>

                                            {/* Purpose */}
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-tight">
                                                    <Building className="h-3.5 w-3.5 text-muted-foreground" /> Purpose of Visit
                                                </label>
                                                <select
                                                    value={form.purpose}
                                                    onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                                                    className="w-full px-4 py-2.5 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow uppercase font-medium"
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
                                            </div>

                                            {/* Check-in time (auto) */}
                                            <div className="flex items-center gap-3 bg-muted/40 rounded-xl px-4 py-3 border">
                                                <Clock className="h-4 w-4 text-emerald-500 shrink-0" />
                                                <div>
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Check-in Time</p>
                                                    <p className="text-sm font-bold text-foreground">{format(currentTime, "h:mm a, MMMM do yyyy").toUpperCase()}</p>
                                                </div>
                                                <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">AUTO</span>
                                            </div>
                                        </div>

                                        {submitError && (
                                            <div className="flex items-center gap-2 text-sm text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-xl px-4 py-3 border border-rose-200 dark:border-rose-500/20">
                                                <AlertCircle className="h-4 w-4 shrink-0" />
                                                {submitError}
                                            </div>
                                        )}

                                        <Button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full rounded-xl py-6 text-base font-bold uppercase tracking-wide gap-2 shadow-md hover:shadow-lg transition-all mt-2"
                                        >
                                            {submitting ? (
                                                <><Loader2 className="h-5 w-5 animate-spin" /> Checking In...</>
                                            ) : (
                                                <><CheckCheck className="h-5 w-5" /> Check In Visitor</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>





            {editVisitor && (
                <EditVisitorModal
                    visitor={editVisitor}
                    onClose={() => setEditVisitor(null)}
                    onSaved={fetchVisitors}
                />
            )}
            {deleteVisitor && (
                <DeleteVisitorModal
                    visitor={deleteVisitor}
                    onClose={() => setDeleteVisitor(null)}
                    onDeleted={fetchVisitors}
                />
            )}

            {printVisitor && (
                <>
                    <PrintStyles />
                    <VisitorCard visitor={printVisitor} isDark={isDark} />
                </>
            )}

            {isFullScreen && (
                <div className="fixed inset-0 z-[500] bg-[#FAFAFA] dark:bg-slate-950 animate-in fade-in duration-500 flex flex-col h-screen overflow-hidden font-sans">
                    {/* Premium Header - Concierge Branding */}
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-b border-border/50 px-8 lg:px-12 py-6 flex items-center justify-between shrink-0 shadow-sm">
                        <div className="flex items-center gap-6">
                            <div className="h-14 w-44 relative flex items-center justify-center p-3 rounded-2xl bg-card border border-border/50 shadow-sm">
                                <img src={isDark ? "/images/whitelogo.jpeg" : "/images/bluelogo.png"} alt="Anthea Logo" className="h-full w-full object-contain" />
                            </div>
                            <div className="h-10 w-[1px] bg-border/40 mx-2 lg:mx-4" />
                            <div>
                                <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight leading-none mb-1">
                                    Visitor <span className="text-primary">Concierge</span>
                                </h1>
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Entry Terminal : SEC-ALPHA</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Section - Status & Ghost Exit */}
                        <div className="flex items-center gap-10">
                            <div className="hidden md:flex flex-col items-end h-10 justify-center text-right border-r border-border/50 pr-10">
                                <p className="text-xl font-bold text-foreground tabular-nums tracking-tighter leading-none mb-1">{currentTime ? format(currentTime, "HH:mm") : "--:--"}</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none opacity-80">{currentTime ? format(currentTime, "EEEE, dd MMM yyyy") : "..."}</p>
                            </div>
                            
                            <div className="group/exit flex items-center">
                                <Button 
                                    size="icon" 
                                    variant="outline" 
                                    onClick={() => toggleFullScreenMode(false)}
                                    className="h-12 w-12 rounded-xl border-border/50 hover:bg-muted font-bold transition-all duration-300 shadow-sm opacity-0 group-hover/exit:opacity-100 group-hover/exit:scale-105 active:scale-95"
                                    title="Exit Terminal"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
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
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Full Identity Name <span className="text-rose-500">*</span></label>
                                                        <input 
                                                            value={form.visitor_name}
                                                            onChange={e => setForm(f => ({ ...f, visitor_name: e.target.value }))}
                                                            className="w-full bg-muted/40 border border-border/50 rounded-2xl px-6 py-4 text-base font-bold focus:bg-card focus:border-primary/40 transition-all outline-none text-foreground placeholder:text-muted-foreground/30 uppercase"
                                                            placeholder="FULL NAME"
                                                        />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Contact Link (Phone) <span className="text-rose-500">*</span></label>
                                                        <input 
                                                            value={form.visitor_phone}
                                                            maxLength={10}
                                                            onChange={e => setForm(f => ({ ...f, visitor_phone: e.target.value.replace(/\D/g, "") }))}
                                                            className="w-full bg-muted/40 border border-border/50 rounded-2xl px-6 py-4 text-base font-bold focus:bg-card focus:border-primary/40 transition-all outline-none text-foreground placeholder:text-muted-foreground/30"
                                                            placeholder="10-DIGIT NUMBER"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-3 relative">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Authorized Host <span className="text-rose-500">*</span></label>
                                                    <div className="relative">
                                                        <input 
                                                            value={userSearchQuery || form.whom_to_meet}
                                                            onFocus={() => setShowUserDropdown(true)}
                                                            onChange={e => {
                                                                setUserSearchQuery(e.target.value);
                                                                setForm(f => ({ ...f, whom_to_meet: e.target.value }));
                                                                setShowUserDropdown(true);
                                                            }}
                                                            className="w-full bg-muted/40 border border-border/50 rounded-2xl px-6 py-5 text-lg font-bold focus:bg-card focus:border-primary/40 transition-all outline-none text-foreground placeholder:text-muted-foreground/30 uppercase"
                                                            placeholder="SEARCH STAFF NAME"
                                                        />
                                                        <Search className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40" />
                                                    </div>
                                                    {showUserDropdown && (
                                                        <div className="absolute z-50 w-full mt-2 bg-card border border-border shadow-2xl rounded-2xl max-h-56 overflow-auto animate-in fade-in slide-in-from-top-2">
                                                            {users.filter(u => u.organization_id === currSession?.organization_id && (u.name?.toLowerCase().includes((userSearchQuery || "").toLowerCase()) || u.org_name?.toLowerCase().includes((userSearchQuery || "").toLowerCase()))).map(u => (
                                                                <button key={u.id} type="button" onClick={() => { setForm(f => ({ ...f, whom_to_meet: u.name, employee_id: u.id })); setUserSearchQuery(u.name); setShowUserDropdown(false); }} className="w-full px-6 py-4 text-left hover:bg-muted flex items-center justify-between border-b last:border-0 border-border/20 group transition-colors">
                                                                    <div>
                                                                        <p className="font-bold text-sm uppercase text-foreground group-hover:text-primary transition-colors">{u.name}</p>
                                                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{u.role} {u.org_name ? `• ${u.org_name}` : ""}</p>
                                                                    </div>
                                                                    <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary transition-all" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mb-4">
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Access Channel (Purpose) <span className="text-rose-500">*</span></label>
                                                        <select 
                                                            value={form.purpose}
                                                            onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                                                            className="w-full bg-muted/40 border border-border/50 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-card focus:border-primary/40 transition-all outline-none text-foreground uppercase"
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
                </div>
            )}
        </div>
    );
}

// ─── Photo Lightbox Modal ───────────────────────────────────────────────────
function PhotoModal({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 backdrop-blur-[32px] animate-in fade-in duration-500" onClick={onClose} />
            <div className="relative max-w-4xl w-full flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
                <div
                    role="button"
                    tabIndex={0}
                    onClick={onClose}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onClose();
                        }
                    }}
                    className="absolute -top-14 right-0 text-foreground flex items-center gap-2 hover:opacity-70 transition-opacity p-2 cursor-pointer"
                >
                    <span className="text-xs font-bold uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">Close</span>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20"><X className="h-6 w-6" /></div>
                </div>
                <div className="group relative p-1 rounded-[32px] border-4 border-primary/10 shadow-[0_0_80px_rgba(0,0,0,0.2)] overflow-hidden transition-all hover:border-primary/20 bg-background/20 backdrop-blur-md">
                    <img
                        src={src}
                        alt={name}
                        className="max-h-[75vh] w-auto rounded-3xl shadow-2xl object-contain animate-in zoom-in duration-500"
                    />
                </div>
                <div className="text-center animate-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-foreground text-3xl font-black uppercase tracking-[0.2em] drop-shadow-sm">{name}</h3>
                    <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.4em] mt-3">Registered Identity Evidence</p>
                </div>
            </div>
        </div>
    );
}

// ─── Edit Visitor Modal ───────────────────────────────────────────────────────
function EditVisitorModal({ visitor, onClose, onSaved }: { visitor: Visitor; onClose: () => void; onSaved: () => void }) {
    const PURPOSES = ["Business Meeting", "Interview", "Delivery", "Client Visit", "Personal", "Maintenance", "Other"];
    const [form, setForm] = useState({
        visitor_name: visitor.visitor_name,
        visitor_phone: visitor.visitor_phone,
        whom_to_meet: visitor.whom_to_meet,
        purpose: visitor.purpose,
    });
    const [submitting, setSubmitting] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.visitor_name.trim()) { showToast("error", "Name required"); return; }
        setSubmitting(true);
        try {
            const res = await fetch(`/api/visitors/${visitor.id}`, {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error("Failed to update");
            showToast("success", "Visitor updated!", `${form.visitor_name.toUpperCase()}'s details have been saved.`);
            onSaved(); onClose();
        } catch (err: any) {
            showToast("error", "Update failed", err.message);
        } finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-card border border-border rounded-[32px] shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="flex items-center justify-between px-8 py-6 border-b bg-muted/30">
                    <div className="flex items-center gap-4">
                        {visitor.visitor_image ? (
                            <img
                                src={visitor.visitor_image}
                                alt={visitor.visitor_name}
                                onClick={() => setPreviewPhoto(true)}
                                className="h-14 w-14 rounded-2xl object-cover border-2 border-primary/20 shadow-md cursor-pointer hover:scale-105 transition-transform"
                            />
                        ) : (
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                                <User className="h-7 w-7 text-primary" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-foreground">{visitor.visitor_name}</h2>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">Update Profile</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors border-2 border-transparent hover:border-border"><X className="h-5 w-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                            <input value={form.visitor_name} onChange={e => setForm(f => ({ ...f, visitor_name: e.target.value }))}
                                className="w-full px-5 py-3 text-sm border-2 rounded-2xl bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all uppercase font-medium" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone</label>
                            <input value={form.visitor_phone} onChange={e => setForm(f => ({ ...f, visitor_phone: e.target.value }))}
                                className="w-full px-5 py-3 text-sm border-2 rounded-2xl bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Whom To Meet</label>
                            <input value={form.whom_to_meet} onChange={e => setForm(f => ({ ...f, whom_to_meet: e.target.value }))}
                                className="w-full px-5 py-3 text-sm border-2 rounded-2xl bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all uppercase font-medium" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Purpose</label>
                            <select value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                                className="w-full px-5 py-3 text-sm border-2 rounded-2xl bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all uppercase font-bold">
                                {PURPOSES.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-4 pt-4">
                        <Button type="button" variant="outline" className="rounded-2xl h-14 flex-1 text-xs font-bold uppercase tracking-widest" onClick={onClose}>Discard</Button>
                        <Button type="submit" disabled={submitting} className="rounded-2xl h-14 flex-1 gap-2 text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95">
                            {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> ...</> : <><CheckCheck className="h-5 w-5" /> Save Changes</>}
                        </Button>
                    </div>
                </form>
            </div>
            {previewPhoto && visitor.visitor_image && (
                <PhotoModal src={visitor.visitor_image} name={visitor.visitor_name} onClose={() => setPreviewPhoto(false)} />
            )}
        </div>
    );
}

// ─── Gantt Chart Component ────────────────────────────────────────────────────
function GanttView({ visitors, onPrint }: { visitors: Visitor[]; onPrint?: (v: Visitor) => void }) {
    const now = new Date();
    const dayStart = startOfDay(now);
    const totalMinutes = 24 * 60;

    const hours = Array.from({ length: 9 }, (_, i) => i + 8); // 8am to 4pm

    if (visitors.length === 0) return <div className="text-center py-10 text-muted-foreground text-sm uppercase font-bold">No visitor data for chart</div>;

    return (
        <div className="min-w-[700px]">
            {/* Hour labels */}
            <div className="flex mb-4 pl-40">
                {hours.map(h => (
                    <div key={h} className="flex-1 text-center text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                        {h > 12 ? `${h - 12}PM` : h === 12 ? "12PM" : `${h}AM`}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="space-y-3">
                {visitors.slice(0, 50).map(v => {
                    const inTime = v.check_in ? new Date(v.check_in) : null;
                    const outTime = v.check_out ? new Date(v.check_out) : (v.status !== "CHECKED_OUT" ? now : null);
                    if (!inTime) return null;

                    const startMins = inTime.getHours() * 60 + inTime.getMinutes();
                    const endMins = outTime ? (outTime.getHours() * 60 + outTime.getMinutes()) : startMins + 30;

                    const windowStart = 8 * 60;
                    const windowEnd = 17 * 60;
                    const windowTotal = windowEnd - windowStart;

                    const left = Math.max(0, Math.min(100, ((startMins - windowStart) / windowTotal) * 100));
                    const width = Math.max(2, Math.min(100 - left, ((endMins - startMins) / windowTotal) * 100));

                    return (
                        <div key={v.id} className="flex items-center gap-4 group">
                            <div className="w-40 shrink-0 flex items-center gap-3">
                                {v.visitor_image ? (
                                    <img src={v.visitor_image} alt={v.visitor_name} className="h-10 w-10 rounded-xl object-cover border border-border shrink-0 shadow-sm transition-transform group-hover:scale-110" />
                                ) : (
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-[10px] shrink-0">
                                        {v.visitor_name?.charAt(0)?.toUpperCase()}
                                    </div>
                                )}
                                <span className="text-[11px] font-black text-foreground truncate uppercase tracking-tight">{v.visitor_name}</span>
                                {onPrint && (
                                    <button onClick={() => onPrint(v)} className="ml-auto p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 opacity-0 group-hover:opacity-100 transition-all" title="Print Badge">
                                        <Printer className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 h-12 bg-muted/20 rounded-2xl relative border-2 border-transparent group-hover:border-primary/20 transition-all">
                                {hours.map((_, i) => (
                                    <div key={i} className="absolute inset-y-0 border-r border-border/10" style={{ left: `${(i / (hours.length)) * 100}%` }} />
                                ))}
                                {/* Bar */}
                                <div
                                    className={`absolute inset-y-2 rounded-xl flex items-center px-4 shadow-lg transition-all ${v.status === "CHECKED_OUT" ? "bg-slate-400/90" : "bg-emerald-500/90 shadow-emerald-500/30"}`}
                                    style={{ left: `${left}%`, width: `${width}%` }}
                                    title={`${v.visitor_name}: ${format(inTime, "h:mm a")} – ${outTime ? format(outTime, "h:mm a") : "now"}`}
                                >
                                    {width > 15 && (
                                        <span className="text-[9px] font-black text-white truncate drop-shadow-md tracking-widest">
                                            {format(inTime, "h:mm a").toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                {/* Current time line */}
                                {(() => {
                                    const curMin = now.getHours() * 60 + now.getMinutes();
                                    const pct = ((curMin - windowStart) / windowTotal) * 100;
                                    return pct >= 0 && pct <= 100
                                        ? <div className="absolute inset-y-0 w-0.5 bg-rose-500/80 z-10" style={{ left: `${pct}%` }} />
                                        : null;
                                })()}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 pt-8 border-t border-border/40 flex flex-wrap items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                <span className="flex items-center gap-3"><span className="h-3 w-6 rounded-md bg-emerald-500/90" /> In Premises</span>
                <span className="flex items-center gap-3"><span className="h-3 w-6 rounded-md bg-slate-400/90" /> Checked Out</span>
                <span className="flex items-center gap-3"><span className="h-3 w-1 bg-rose-500/80 rounded-full" /> Live Now</span>
            </div>
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ setActiveTab }: { setActiveTab: (t: string) => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="p-8 bg-muted/40 rounded-[40px] border-4 border-dashed border-border/40 relative">
                <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary/20 animate-ping" />
            </div>
            <div className="text-center space-y-2">
                <p className="text-xl font-black text-foreground uppercase tracking-widest">Zero Intelligence</p>
                <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-tight">No visitor activity has been recorded today.</p>
            </div>
        </div>
    );
}

// ─── Delete Visitor Modal ───────────────────────────────────────────────────────
function DeleteVisitorModal({ visitor, onClose, onDeleted }: { visitor: Visitor; onClose: () => void; onDeleted: () => void }) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/visitors/${visitor.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            showToast("success", "Visitor removed", `${visitor.visitor_name} has been deleted.`);
            onDeleted();
            onClose();
        } catch (err: any) {
            showToast("error", "Delete failed", err.message);
        } finally { setDeleting(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="h-14 w-14 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                        <AlertCircle className="h-7 w-7 text-rose-500" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-foreground">Delete Record?</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Are you sure you want to delete <span className="font-semibold text-foreground uppercase">{visitor.visitor_name}</span>? This action is permanent.
                        </p>
                    </div>
                    <div className="flex gap-3 w-full">
                        <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose} disabled={deleting}>Cancel</Button>
                        <Button disabled={deleting} className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white gap-2 shadow-md" onClick={handleDelete}>
                            {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> ...</> : <><Trash2 className="h-4 w-4" /> Delete</>}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Print Component ──────────────────────────────────────────────────────────
function VisitorCard({ visitor, isDark }: { visitor: Visitor, isDark: boolean }) {
    if (!visitor) return null;

    return (
        <div className="print-only fixed inset-0 bg-white z-[999999] flex items-center justify-center p-0 m-0">
            <div className="card-container w-[100mm] h-[155mm] bg-white rounded-[8mm] shadow-none relative flex flex-col overflow-hidden font-sans border-[2.5px] border-black">
                {/* Reverted Header height and spacing */}
                <div className="w-full h-[45mm] bg-gradient-to-b from-[#0055D4] to-[#00A3FF] flex flex-col items-center pt-[5mm] relative shrink-0">
                    {/* Anthea Pharma Logo - Local Source */}
                    <div className="w-[22mm] h-[22mm] bg-white  flex items-center justify-center p-[2.5mm]  overflow-hidden">
                        <img
                            src={isDark ? "/images/whitelogo.jpeg" : "/images/bluelogo.png"}
                            alt="Anthea Pharma"
                            className="w-full h-auto max-h-full object-contain scale-110"
                        />
                    </div>

                    {/* Reverted Visitor Photo - 36mm for compact look */}
                    <div className="absolute bottom-0 translate-y-1/2 w-[36mm] h-[36mm] rounded-full border-[1.8mm] border-white shadow-xl overflow-hidden bg-slate-50 flex items-center justify-center">
                        {visitor.visitor_image ? (
                            <img src={visitor.visitor_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                                <User className="w-[15mm] h-[15mm]" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Body Content - Neater padding and smaller fonts */}
                <div className="flex-1 pt-[25mm] px-[10mm] flex flex-col items-center">
                    {/* Decreased Name font size - 6.5mm */}
                    <h1 className="text-[6.5mm] font-black text-[#1E3A8A] uppercase tracking-wider mb-[10mm] text-center leading-[1.2] antialiased">
                        {visitor.visitor_name}
                    </h1>

                    {/* Decreased Detail rows - 3.8mm */}
                    <div className="w-full space-y-[5mm]">
                        <div className="grid grid-cols-[1.6fr_0.3fr_2.4fr] items-baseline border-b border-slate-50 pb-[2mm]">
                            <span className="text-[3.8mm] font-bold text-[#1E3A8A] uppercase tracking-tight">Phone No</span>
                            <span className="text-[3.8mm] text-[#1E3A8A] text-center">:</span>
                            <span className="text-[3.8mm] text-slate-500 font-semibold pl-[1.5mm]">{visitor.visitor_phone}</span>
                        </div>
                        <div className="grid grid-cols-[1.6fr_0.3fr_2.4fr] items-baseline border-b border-slate-50 pb-[2mm]">
                            <span className="text-[3.8mm] font-bold text-[#1E3A8A] uppercase tracking-tight">Purpose</span>
                            <span className="text-[3.8mm] text-[#1E3A8A] text-center">:</span>
                            <span className="text-[3.8mm] text-slate-600 font-bold pl-[1.5mm]">{visitor.purpose || "Meeting"}</span>
                        </div>
                        <div className="grid grid-cols-[1.6fr_0.3fr_2.4fr] items-baseline border-b border-slate-50 pb-[2mm]">
                            <span className="text-[3.8mm] font-bold text-[#1E3A8A] uppercase tracking-tight">Whom to Meet</span>
                            <span className="text-[3.8mm] text-[#1E3A8A] text-center">:</span>
                            <span className="text-[3.8mm] text-slate-600 font-bold pl-[1.5mm] uppercase">{visitor.whom_to_meet || "N/A"}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Section - Clean and compact */}
                <div className="pb-[12mm] pt-[6mm] mt-auto w-full flex flex-col items-center shrink-0">
                    <div className="w-[50mm] h-[0.4mm] bg-slate-200 mb-[3mm]" />
                    <p className="text-[3.8mm] font-bold text-slate-400 uppercase tracking-[0.2em] antialiased">
                        Signature
                    </p>
                </div>

                {/* Accent stripe at the very bottom */}
                <div className="h-[2.5mm] w-full bg-[#0055D4]" />
            </div>
        </div>
    );
}

const PrintStyles = () => (
    <style dangerouslySetInnerHTML={{
        __html: `
        @media screen {
            .print-only { display: none !important; }
        }
        @media print {
            /* 
               CRITICAL: Use visibility instead of display for SPA printing 
               This hides all elements but allows us to selectively re-show children.
            */
            * {
                visibility: hidden !important;
            }

            /* Make the body background white for print */
            html, body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            /* Show the print overlay and EVERYTHING inside it */
            .print-only, .print-only * {
                visibility: visible !important;
            }

            /* Center the card on the printed page */
            .print-only {
                display: flex !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                justify-content: center !important;
                align-items: center !important;
                background: white !important;
                z-index: 2147483647 !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            /* Reset any transforms that might interfere with print positioning */
            .card-container {
                transform: none !important;
            }

            @page {
                size: 100mm 155mm;
                margin: 0;
            }
            
            html, body {
                width: 100mm;
                height: 155mm;
                margin: 0;
                padding: 0;
                background: white;
            }
        }
    `}} />
);


