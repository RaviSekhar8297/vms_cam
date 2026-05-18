"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, TrendingUp, Search, Calendar, Filter, Users, GitBranch, Ticket, Database, Clock, ArrowUpRight, List, Table2, LayoutGrid, GanttChartSquare, X, Download, FileSpreadsheet, Building, BookOpen, TrendingDown, UserCheck, AlertCircle, Loader2, MoreVertical, CheckCircle2 } from "lucide-react";
import {
    format, differenceInMinutes, addDays, startOfDay,
    isSameDay, subWeeks, subMonths, isAfter
} from "date-fns";
import * as XLSX from "xlsx";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// ─── View Types ────────────────────────────────────────────────────────────────
const VIEWS = [
    { id: "list", label: "List", icon: List },
    { id: "table", label: "Table", icon: Table2 },
    { id: "kanban", label: "Kanban", icon: LayoutGrid },
    { id: "gantt", label: "Gantt", icon: GanttChartSquare },
] as const;

type ViewId = "list" | "table" | "kanban" | "gantt";

type Visitor = {
    id: string;
    visitor_name: string;
    visitor_phone?: string;
    whom_to_meet?: string;
    purpose?: string;
    org_name?: string;
    check_in: string;
    check_out?: string;
    status: string;
    visitor_image?: string;
};

// ─── Status helpers ──────────────────────────────────────────────────────────
const statusBadge = (status: string) =>
    status === "CHECKED_OUT"
        ? "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
        : "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";

const statusLabel = (s: string) =>
    s === "CHECKED_OUT" ? "Checked Out" : "In Premises";

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
    const [view, setView] = useState<ViewId>("table");
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [orgCount, setOrgCount] = useState(0);
    const [userCount, setUserCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [currSession, setCurrSession] = useState<any>(null);
    const [filterRange, setFilterRange] = useState<"all" | "today" | "week" | "month">("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [mounted, setMounted] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [animationKey, setAnimationKey] = useState(0);
    const itemsPerPage = 8;

    useEffect(() => {
        const interval = setInterval(() => {
            setAnimationKey(prev => prev + 1);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setMounted(true);
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchSession = useCallback(() => {
        fetch("/api/auth/me").then(r => r.json())
            .then(data => setCurrSession(data.user?.user || data.user))
            .catch(() => { });
    }, []);

    const fetchVisitors = useCallback(() => {
        fetch("/api/visitors").then(r => r.json()).then(d => {
            setVisitors(Array.isArray(d) ? d : []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchSession();
        fetchVisitors();
    }, [fetchSession, fetchVisitors]);

    useEffect(() => {
        if (!currSession) return;

        // Fetch counts only when session is available
        const fetchCounts = async () => {
            try {
                const [orgsRes, usersRes] = await Promise.all([
                    fetch("/api/organizations"),
                    fetch("/api/users")
                ]);

                if (orgsRes.ok) {
                    const orgs = await orgsRes.json();
                    setOrgCount(Array.isArray(orgs) ? orgs.length : 0);
                }

                if (usersRes.ok) {
                    const users = await usersRes.json();
                    setUserCount(Array.isArray(users) ? users.length : 0);
                }
            } catch (error) {
                console.error("Count fetch error:", error);
            }
        };

        fetchCounts();
    }, [currSession]);

    const orgFilteredVisitors = visitors.filter(v => {
        if (currSession?.role === "SUPERADMIN") return true;
        return (v as any).organization_id === currSession?.organization_id;
    });

    const total = orgFilteredVisitors.length;
    const active = orgFilteredVisitors.filter(v => v.status !== "CHECKED_OUT").length;
    const checkedOut = orgFilteredVisitors.filter(v => v.status === "CHECKED_OUT").length;

    const chartData = useMemo(() => {
        const data = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const formattedDate = format(date, "MMM dd");
            const count = orgFilteredVisitors.filter(v => {
                if (!v.check_in) return false;
                const vDate = new Date(v.check_in);
                return vDate.getDate() === date.getDate() &&
                    vDate.getMonth() === date.getMonth() &&
                    vDate.getFullYear() === date.getFullYear();
            }).length;
            data.push({
                date: formattedDate,
                visitors: count
            });
        }
        return data;
    }, [orgFilteredVisitors]);

    const filtered = orgFilteredVisitors.filter(v => {
        const matchesSearch = v.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.whom_to_meet?.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        // Time Filter
        if (filterRange === "all") return true;

        const checkInDate = v.check_in ? new Date(v.check_in) : null;
        if (!checkInDate) return false;

        if (filterRange === "today") {
            return isSameDay(checkInDate, new Date());
        } else if (filterRange === "week") {
            const lastWeek = subWeeks(new Date(), 1);
            return isAfter(checkInDate, lastWeek);
        } else if (filterRange === "month") {
            const lastMonth = subMonths(new Date(), 1);
            return isAfter(checkInDate, lastMonth);
        }

        return true;
    });

    const handleExportExcel = () => {
        if (filtered.length === 0) return;

        const exportData = filtered.map(v => ({
            "Visitor": v.visitor_name,
            "Phone": v.visitor_phone,
            "To Meet": v.whom_to_meet,
            "Purpose": v.purpose,
            "Organization": v.org_name,
            "Check-In": v.check_in ? format(new Date(v.check_in), "yyyy-MM-dd HH:mm:ss") : "—",
            "Check-Out": v.check_out ? format(new Date(v.check_out), "yyyy-MM-dd HH:mm:ss") : "In Premises",
            "Status": v.status === "CHECKED_OUT" ? "Checked Out" : "In Premises"
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Dashboard_Visitors");
        XLSX.writeFile(wb, `Visitors_Dashboard_${filterRange}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    };

    const active_visitors = filtered.filter(v => v.status !== "CHECKED_OUT");
    const out_visitors = filtered.filter(v => v.status === "CHECKED_OUT");

    // Pagination logic
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterRange, view]);

    // ── METRICS CARDS ─────────────────────────────────────────────────────────
    const metrics = [
        { id: "total", label: "Total Visitors", subtitle: "All Time", value: total, color: "bg-gradient-to-r from-[#35d0b9] to-[#65eed0]", icon: GitBranch, href: "/visitors" },
        { id: "orgs", label: "Organizations", subtitle: "Registered", value: orgCount, color: "bg-gradient-to-r from-[#eb5c83] to-[#feb04e]", icon: Ticket, href: "/organizations" },
        { id: "users", label: "System Users", subtitle: "Active", value: userCount, color: "bg-gradient-to-r from-[#56bdfa] to-[#80e5fd]", icon: Database, href: "/users" },
        { id: "out", label: "Checked Out", subtitle: "Today", value: checkedOut, color: "bg-gradient-to-r from-[#8b65e7] to-[#df72cb]", icon: Users, href: "/visitors" },
    ];

    return (
        <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500 overflow-y-auto relative pb-6 scrollbar-hide">
            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-1 shrink-0">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                            <LayoutDashboard className="h-4 w-4 md:h-5 md:w-5 text-violet-500" />
                        </div>
                        <h4 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                            Overview
                        </h4>
                    </div>
                    <p className="text-[10px] md:text-sm font-bold text-muted-foreground/60 uppercase tracking-[0.2em] ml-1">
                        Facility Intelligence Dashboard
                    </p>
                </div>

            </div>

            {/* Metric Cards - shrinkable but fixed row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 shrink-0">
                {metrics.map(m => {
                    const canAccess = !m.href || (
                        (m.id === "orgs" && ["SUPERADMIN", "ADMIN", "RECEPTIONIST"].includes(currSession?.role)) ||
                        (m.id === "users" && ["SUPERADMIN", "ADMIN"].includes(currSession?.role)) ||
                        (m.id === "total" || m.id === "out")
                    );

                    const CardContent = (
                        <div key={m.label} className={`group relative ${m.color} rounded-[12px] shadow-sm p-5 flex justify-between items-center transition-all duration-300 overflow-hidden ${canAccess ? "hover:shadow-lg hover:translate-y-[-2px] cursor-pointer" : "opacity-80"
                            }`}>
                            
                            {/* Large Background Icon - Matching User Screenshot Style */}
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20 transform -rotate-12 transition-transform group-hover:rotate-0 duration-500">
                                <m.icon className="h-16 w-16 text-white" />
                            </div>

                            <div className="flex flex-col flex-1 min-w-0 z-10 self-start ml-2">
                                <h3 className="text-base font-bold text-white tracking-wide truncate drop-shadow-sm">
                                    {m.label}
                                </h3>
                                <p className="text-xs text-white/80 font-medium tracking-wide truncate mt-0.5 drop-shadow-sm">
                                    {m.subtitle}
                                </p>
                            </div>

                            <div className="flex flex-col items-end z-10 self-end">
                                <span className="text-[10px] text-white/80 font-bold tracking-widest mb-0.5 drop-shadow-sm uppercase">
                                    Count
                                </span>
                                <h3 className="text-4xl font-bold text-white tracking-tight leading-none drop-shadow-md">
                                    {m.value}
                                </h3>
                            </div>
                        </div>
                    );

                    if (canAccess && m.href) {
                        return (
                            <Link key={m.id} href={m.href}>
                                {CardContent}
                            </Link>
                        );
                    }

                    return CardContent;
                })}
            </div>

            {/* Analytics Chart */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 sm:p-6 shrink-0 transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-bold tracking-tight">Visitor Analytics (Last 30 Days)</h3>
                </div>
                <div className="h-64 sm:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                minTickGap={20}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                allowDecimals={false}
                            />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: '0.75rem',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                                }}
                                itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                                labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                            />
                            <Area
                                key={animationKey}
                                type="monotone"
                                dataKey="visitors"
                                name="Visitors"
                                stroke="#8b5cf6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorVisitors)"
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#8b5cf6' }}
                                isAnimationActive={true}
                                animationDuration={5000}
                                animationEasing="linear"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Views Panel Section */}
            <div className="flex-1 min-h-[500px] min-w-0 bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col pb-10 sm:pb-0">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-2.5 border-b border-border/50 bg-muted/20 backdrop-blur-sm shrink-0">
                    <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                        <div className="relative group flex-1 sm:flex-none">
                            <input
                                placeholder="Search records..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-10 pr-10 py-1.5 text-xs font-bold uppercase tracking-widest border border-border/50 rounded-2xl bg-background/50 focus:outline-none focus:ring-4 focus:ring-primary/10 w-full sm:w-64 transition-all group-hover:bg-background"
                            />
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all">
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Filter range with premium look */}
                        <div className="flex items-center bg-background/60 border border-border/50 rounded-2xl p-1 shadow-inner gap-1">
                            {(["all", "today", "week", "month"] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFilterRange(type)}
                                    className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 ${filterRange === type
                                        ? "bg-foreground text-background shadow-lg"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportExcel}
                            title="Export to Excel"
                            className="rounded-2xl h-9 w-9 p-0 flex items-center justify-center border-emerald-500/30 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all duration-500 shadow-sm"
                        >
                            <FileSpreadsheet className="h-5 w-5" />
                        </Button>

                        {/* View switcher - premium glassmorphism */}
                        <div className="flex items-center bg-muted/40 backdrop-blur-md rounded-2xl p-1 gap-1.5 shadow-inner border border-border/20">
                            {VIEWS.map(v => {
                                const Icon = v.icon;
                                const active = view === v.id;
                                return (
                                    <button
                                        key={v.id}
                                        onClick={() => setView(v.id as ViewId)}
                                        title={v.label}
                                        className={`p-1.5 rounded-xl transition-all duration-500 ${active
                                            ? "bg-background text-foreground shadow-xl border border-border/50 scale-105"
                                            : "text-muted-foreground hover:text-foreground group"
                                            }`}>
                                        <Icon className={`h-4 w-4 transition-transform duration-500 ${!active && "group-hover:scale-110"}`} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex justify-center items-center py-20 gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-muted-foreground">Loading data...</span>
                    </div>
                )}

                {/* ── LIST VIEW ─────────────────────────────────────────────── */}
                {!loading && view === "list" && (
                    <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border scrollbar-thin">
                        {paginatedItems.length === 0
                            ? <EmptyState />
                            : paginatedItems.map(v => (
                                <div key={v.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/10 transition-all duration-300 group">
                                    {v.visitor_image ? (
                                        <img src={v.visitor_image} alt={v.visitor_name} className="h-10 w-10 rounded-xl object-cover border border-border shrink-0 shadow-sm" />
                                    ) : (
                                        <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 font-semibold shrink-0">
                                            {v.visitor_name?.charAt(0)?.toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-foreground truncate tracking-tight">{v.visitor_name}</p>
                                        <p className="text-[11px] text-muted-foreground font-medium">{v.whom_to_meet ? `Meeting: ${v.whom_to_meet}` : v.purpose || "No purpose listed"}</p>
                                    </div>
                                    <div className="hidden sm:flex flex-col items-end gap-1">
                                        <span className="text-xs font-semibold text-foreground">{v.check_in ? format(new Date(v.check_in), "h:mm a") : "—"}</span>
                                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">{v.check_in ? format(new Date(v.check_in), "MMM dd, yyyy") : ""}</span>
                                    </div>
                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-tight ${statusBadge(v.status)}`}>
                                        {statusLabel(v.status)}
                                    </span>
                                </div>
                            ))
                        }
                    </div>
                )}

                {/* ── TABLE VIEW ────────────────────────────────────────────── */}
                {!loading && view === "table" && (
                    <div className="flex-1 min-h-0 overflow-auto scrollbar-thin relative">
                        <table className="w-full text-sm text-left relative">
                            <thead className="text-[11px] text-muted-foreground/70 uppercase font-semibold tracking-wider bg-muted/80 backdrop-blur-md border-b border-border/40 sticky top-0 z-10 shadow-sm leading-none">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Visitor</th>
                                    <th className="px-6 py-4 font-semibold hidden md:table-cell">To Meet</th>
                                    <th className="px-6 py-4 font-semibold">Check-In</th>
                                    <th className="px-6 py-4 font-semibold">Check-Out</th>
                                    <th className="px-6 py-4 font-semibold text-right pr-10">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {paginatedItems.length === 0
                                    ? <tr><td colSpan={5}><EmptyState /></td></tr>
                                    : paginatedItems.map(v => (
                                        <tr key={v.id} className="hover:bg-muted/10 transition-all duration-300 group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {v.visitor_image ? (
                                                        <img src={v.visitor_image} alt={v.visitor_name} className="h-10 w-10 rounded-xl object-cover border border-border shrink-0 shadow-sm" />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 font-semibold text-xs shrink-0">
                                                            {v.visitor_name?.charAt(0)?.toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-foreground text-sm tracking-tight truncate">{v.visitor_name}</p>
                                                        <p className="text-[11px] text-muted-foreground font-medium">{v.visitor_phone}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell">
                                                <p className="text-xs font-semibold text-foreground">{v.whom_to_meet || "—"}</p>
                                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{v.purpose || "—"}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-semibold text-foreground">{v.check_in ? format(new Date(v.check_in), "h:mm a") : "—"}</p>
                                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{v.check_in ? format(new Date(v.check_in), "MMM dd, yyyy") : ""}</p>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">
                                                {v.check_out ? (
                                                    <div className="flex flex-col">
                                                        <p className="text-foreground">{format(new Date(v.check_out), "h:mm a")}</p>
                                                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{format(new Date(v.check_out), "MMM dd, yyyy")}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] items-center gap-1.5 inline-flex font-bold text-emerald-500 uppercase tracking-tight bg-emerald-500/5 px-2 py-0.5 rounded-lg border border-emerald-500/10">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right pr-10">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${statusBadge(v.status)}`}>
                                                    {statusLabel(v.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                    )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── KANBAN VIEW ───────────────────────────────────────────── */}
                {!loading && view === "kanban" && (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Status columns show full filtered list (Kanban usually doesn't paginate per column like this, but we'll show paginated items for consistency or full filtered if preferred for Kanban. Given user asked for pagination, we'll stick to paginatedItems for consistency with total count) */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 pb-2 border-b-2 border-emerald-500/20">
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                                <h3 className="font-black text-[10px] text-emerald-600 uppercase tracking-[0.2em]">In Premises</h3>
                                <span className="ml-auto bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg">{paginatedItems.filter(v => v.status !== "CHECKED_OUT").length}</span>
                            </div>
                            {paginatedItems.filter(v => v.status !== "CHECKED_OUT").length === 0
                                ? <div className="rounded-2xl border-2 border-dashed border-border/30 p-10 text-center text-muted-foreground text-[10px] font-black uppercase tracking-widest bg-muted/5">No active sessions</div>
                                : paginatedItems.filter(v => v.status !== "CHECKED_OUT").map(v => (
                                    <div key={v.id} className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm hover:shadow-xl hover:border-emerald-500/20 transition-all duration-500 group/k">
                                        <div className="flex items-center gap-3">
                                            {v.visitor_image ? (
                                                <img src={v.visitor_image} alt={v.visitor_name} className="h-10 w-10 rounded-xl object-cover border border-border group-hover/k:scale-105 transition-transform" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-600 font-semibold text-xs">
                                                    {v.visitor_name?.charAt(0)?.toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-sm text-foreground truncate tracking-tight">{v.visitor_name}</p>
                                                <p className="text-[11px] text-muted-foreground font-medium">{v.visitor_phone}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-semibold text-muted-foreground uppercase opacity-50 tracking-wider italic">Check-In</span>
                                                <span className="text-xs font-bold text-foreground">{v.check_in ? format(new Date(v.check_in), "h:mm a") : "—"}</span>
                                            </div>
                                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                                <UserCheck className="h-4 w-4 text-emerald-500" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 pb-2 border-b-2 border-slate-500/20">
                                <CheckCircle2 className="h-4 w-4 text-slate-500" />
                                <h3 className="font-black text-[10px] text-slate-500 uppercase tracking-[0.2em]">History</h3>
                                <span className="ml-auto bg-slate-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg">{paginatedItems.filter(v => v.status === "CHECKED_OUT").length}</span>
                            </div>
                            {paginatedItems.filter(v => v.status === "CHECKED_OUT").length === 0
                                ? <div className="rounded-2xl border-2 border-dashed border-border/30 p-10 text-center text-muted-foreground text-[10px] font-black uppercase tracking-widest bg-muted/5">No completed logs</div>
                                : paginatedItems.filter(v => v.status === "CHECKED_OUT").map(v => (
                                    <div key={v.id} className="bg-card rounded-2xl border border-border/50 p-4 opacity-70 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all duration-500 group/k">
                                        <div className="flex items-center gap-3">
                                            {v.visitor_image ? (
                                                <img src={v.visitor_image} alt={v.visitor_name} className="h-10 w-10 rounded-xl object-cover border border-border" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground font-black text-xs">
                                                    {v.visitor_name?.charAt(0)?.toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="font-black text-xs text-foreground truncate">{v.visitor_name?.toUpperCase()}</p>
                                                <p className="text-[10px] text-muted-foreground font-bold">{v.visitor_phone}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-[10px] font-black">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Clock className="h-3 w-3" />
                                                <span>{v.check_in ? format(new Date(v.check_in), "HH:mm") : "—"}</span>
                                                <span className="opacity-30">→</span>
                                                <span>{v.check_out ? format(new Date(v.check_out), "HH:mm") : "—"}</span>
                                            </div>
                                            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-slate-600 uppercase">Gone</span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* ── GANTT VIEW ────────────────────────────────────────────── */}
                {!loading && view === "gantt" && (
                    <div className="overflow-x-auto p-6">
                        <GanttView visitors={paginatedItems} />
                    </div>
                )}

                {/* ── PAGINATION ────────────────────────────────────────────── */}
                {!loading && filtered.length > 0 && (
                    <div className="p-3 border-t border-border/50 bg-muted/5 flex items-center justify-between shrink-0">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                            Showing <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-foreground">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="text-foreground">{filtered.length}</span> records
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="h-8 w-8 p-0 rounded-lg"
                            >
                                <span className="sr-only">Previous</span>
                                <TrendingDown className="h-4 w-4 rotate-90" />
                            </Button>

                            <div className="flex items-center gap-1 px-2">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .map((p, i, arr) => (
                                        <div key={p} className="flex items-center gap-1">
                                            {i > 0 && arr[i - 1] !== p - 1 && <span className="text-muted-foreground">...</span>}
                                            <button
                                                onClick={() => setCurrentPage(p)}
                                                className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${currentPage === p
                                                    ? "bg-foreground text-background"
                                                    : "text-muted-foreground hover:bg-muted"
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        </div>
                                    ))}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 p-0 rounded-lg"
                            >
                                <span className="sr-only">Next</span>
                                <TrendingUp className="h-4 w-4 rotate-90" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="p-4 bg-muted/50 rounded-full">
                <BookOpen className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div className="text-center">
                <p className="font-medium text-foreground">No visitor data</p>
                <p className="text-sm text-muted-foreground mt-1">Visitor records will appear here once added.</p>
            </div>
        </div>
    );
}

// ─── Gantt Chart Component ────────────────────────────────────────────────────
function GanttView({ visitors }: { visitors: Visitor[] }) {
    const now = new Date();
    const dayStart = startOfDay(now);
    const totalMinutes = 24 * 60;

    const getPercent = (date: Date) => {
        const mins = differenceInMinutes(date, dayStart);
        return Math.max(0, Math.min(100, (mins / totalMinutes) * 100));
    };

    const hours = Array.from({ length: 9 }, (_, i) => i + 8); // 8am to 4pm

    if (visitors.length === 0) return <EmptyState />;

    return (
        <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="flex mb-3 pl-40">
                {hours.map(h => (
                    <div key={h} className="flex-1 text-center text-[11px] font-semibold text-muted-foreground">
                        {h > 12 ? `${h - 12}pm` : h === 12 ? "12pm" : `${h}am`}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="space-y-2">
                {visitors.slice(0, 20).map(v => {
                    const inTime = v.check_in ? new Date(v.check_in) : null;
                    const outTime = v.check_out ? new Date(v.check_out) : (v.status !== "CHECKED_OUT" ? now : null);
                    const startMins = inTime ? (inTime.getHours() - 8) * 60 + inTime.getMinutes() : 0;
                    const endMins = outTime ? (outTime.getHours() - 8) * 60 + outTime.getMinutes() : startMins + 30;
                    const workMinutes = 9 * 60; // 8am to 5pm window
                    const left = Math.max(0, Math.min(100, (startMins / workMinutes) * 100));
                    const width = Math.max(1, Math.min(100 - left, ((endMins - startMins) / workMinutes) * 100));

                    return (
                        <div key={v.id} className="flex items-center gap-3">
                            <div className="w-40 shrink-0 flex items-center gap-2">
                                {v.visitor_image ? (
                                    <img src={v.visitor_image} alt={v.visitor_name} className="h-7 w-7 rounded-full object-cover border border-border shrink-0" />
                                ) : (
                                    <div className="h-7 w-7 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 font-bold text-xs shrink-0">
                                        {v.visitor_name?.charAt(0)?.toUpperCase()}
                                    </div>
                                )}
                                <span className="text-xs font-semibold text-foreground truncate">{v.visitor_name?.toUpperCase()}</span>
                            </div>
                            <div className="flex-1 h-8 bg-muted/40 rounded-lg relative border border-border">
                                {/* Hour grid lines */}
                                {hours.map((_, i) => (
                                    <div key={i} className="absolute inset-y-0 border-r border-border/50" style={{ left: `${(i / (hours.length)) * 100}%` }} />
                                ))}
                                {/* Bar */}
                                <div
                                    className={`absolute inset-y-1 rounded-md flex items-center px-2 ${v.status === "CHECKED_OUT" ? "bg-slate-400/80" : "bg-emerald-500/80"}`}
                                    style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                                    title={`${v.visitor_name}: ${inTime ? format(inTime, "h:mm a") : "?"} – ${outTime ? format(outTime, "h:mm a") : "now"}`}
                                >
                                    {width > 10 && (
                                        <span className="text-[9px] font-bold text-white truncate">
                                            {inTime ? format(inTime, "h:mm a") : ""}
                                        </span>
                                    )}
                                </div>
                                {/* Current time line */}
                                {(() => {
                                    const curMin = (now.getHours() - 8) * 60 + now.getMinutes();
                                    const pct = (curMin / workMinutes) * 100;
                                    return pct >= 0 && pct <= 100
                                        ? <div className="absolute inset-y-0 w-[2px] bg-rose-500/80 z-10" style={{ left: `${pct}%` }} />
                                        : null;
                                })()}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded bg-emerald-500/80" /> In Premises</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded bg-slate-400/80" /> Checked Out</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-0.5 bg-rose-500/80" /> Current Time</span>
            </div>
        </div>
    );
}
