"use client";

import * as XLSX from "xlsx";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
    CreditCard, Building, Calendar, Plus, Search,
    Download, CheckCircle2, XCircle, Loader2,
    Zap, Star, Layout, Filter, AlertCircle, TrendingUp, RefreshCcw,
    Clock, ChevronDown, Check, X, ShieldCheck, Trash2, Smartphone, QrCode, Scan
} from "lucide-react";
import { format, addMonths, addYears } from "date-fns";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/Toast";

type Plan = {
    id: number;
    plan_name: string;
    plan_type: 'monthly' | 'quarterly' | 'halfyearly' | 'yearly' | 'lifetime';
    amount: number;
    status: string;
    created_at: string;
};

type Subscription = {
    id: number;
    organization_id: string;
    plan_id: number;
    start_date: string;
    end_date: string;
    status: string;
    created_at: string;
    plan_name: string;
    plan_type: string;
    amount: number;
    organization_name: string;
    payment_mode?: string;
};

type Organization = {
    id: string;
    name: string;
};

type PaymentMode = "credit" | "debit" | "upi" | "qr";

export default function PlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [currSession, setCurrSession] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"plans" | "renewals" | "manage">("plans");
    const [searchQuery, setSearchQuery] = useState("");
    const [planFilter, setPlanFilter] = useState("All");

    // Modal state
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    const [selectedOrgId, setSelectedOrgId] = useState("");
    const [selectedPlanId, setSelectedPlanId] = useState("");
    const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Payment form states
    const [cardDetails, setCardDetails] = useState({ number: "", name: "", month: "", year: "", cvv: "" });
    const [upiId, setUpiId] = useState("");
    const [upiHandle, setUpiHandle] = useState("@axl");

    // Custom Alert/Confirmation State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: "danger" | "warning";
    }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
        type: "danger"
    });

    const fetchSession = useCallback(() => {
        fetch("/api/auth/me").then(r => r.json())
            .then(data => setCurrSession(data.user?.user || data.user))
            .catch(() => { });
    }, []);

    const fetchPlans = useCallback(async () => {
        try {
            const res = await fetch("/api/plans");
            if (res.ok) {
                const data = await res.json();
                setPlans(data);
            }
        } catch (error) {
            console.error("Fetch plans error:", error);
        }
    }, []);

    const fetchSubscriptions = useCallback(async () => {
        try {
            const res = await fetch("/api/plan-subscriptions");
            if (res.ok) {
                const data = await res.json();
                setSubscriptions(data);
            }
        } catch (error) {
            console.error("Fetch subscriptions error:", error);
        }
    }, []);

    const fetchOrganizations = useCallback(async () => {
        try {
            const res = await fetch("/api/organizations");
            if (res.ok) {
                const data = await res.json();
                setOrganizations(data);
            }
        } catch (error) {
            console.error("Fetch organizations error:", error);
        }
    }, []);

    const toggleBuyModal = (open: boolean, planId?: string) => {
        setIsBuyModalOpen(open);
        if (open) {
            if (planId) setSelectedPlanId(planId);
            // Auto-select organization for ADMINs
            if (currSession?.role === "ADMIN" && currSession?.organization_id) {
                setSelectedOrgId(currSession.organization_id);
            }
        } else {
            setSelectedOrgId("");
            setSelectedPlanId("");
            setPaymentMode(null);
            setCardDetails({ number: "", name: "", month: "", year: "", cvv: "" });
            setUpiId("");
            setUpiHandle("@axl");
        }
    };

    useEffect(() => {
        fetchSession();
        Promise.all([fetchPlans(), fetchSubscriptions(), fetchOrganizations()]).finally(() => setLoading(false));
    }, [fetchSession, fetchPlans, fetchSubscriptions, fetchOrganizations]);

    const filteredSubscriptions = useMemo(() => {
        let base = subscriptions.filter(s => s.organization_name !== "System");

        // Admin restriction: Only show their own organization data
        if (currSession?.role === "ADMIN" && currSession?.organization_id) {
            base = base.filter(s => String(s.organization_id) === String(currSession.organization_id));
        }

        return base.filter(s => {
            const matchesSearch = s.organization_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.plan_name?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesPlan = planFilter === "All" || s.plan_name === planFilter;
            return matchesSearch && matchesPlan;
        });
    }, [subscriptions, searchQuery, planFilter, currSession]);

    const handleBuyPlan = async () => {
        if (!selectedOrgId || !selectedPlanId) {
            showToast("error", "Error", "Please select organization and plan");
            return;
        }

        setIsSubmitting(true);
        try {
            const plan = plans.find(p => p.id === Number(selectedPlanId));
            if (!plan) return;

            const startDate = new Date();
            let endDate: Date | null = null;

            if (plan.plan_type === 'monthly') endDate = addMonths(startDate, 1);
            else if (plan.plan_type === 'quarterly') endDate = addMonths(startDate, 3);
            else if (plan.plan_type === 'halfyearly') endDate = addMonths(startDate, 6);
            else if (plan.plan_type === 'yearly') endDate = addYears(startDate, 1);

            const res = await fetch("/api/plan-subscriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    organization_id: selectedOrgId,
                    plan_id: Number(selectedPlanId),
                    start_date: startDate.toISOString().split('T')[0],
                    end_date: endDate ? endDate.toISOString().split('T')[0] : null,
                    payment_mode: paymentMode
                })
            });

            if (res.ok) {
                showToast("success", "Success", "Plan activated successfully!");
                toggleBuyModal(false);
                fetchSubscriptions();
            } else {
                showToast("error", "Error", "Failed to activate plan");
            }
        } catch (error) {
            console.error("Activate plan error:", error);
            showToast("error", "Error", "An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePlan = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: "Security Clearance Required",
            message: "The requested operation will permanently purge this Plan Tier and all associated Subscription Records from the central database. This action is irreversible.",
            type: "danger",
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    const res = await fetch(`/api/plans?id=${id}`, { method: "DELETE" });
                    if (res.ok) {
                        showToast("success", "Success", "Plan Tier Purged Successfully");
                        fetchPlans();
                        fetchSubscriptions();
                    } else {
                        showToast("error", "Error", "Authorization Failed or System Error");
                    }
                } catch (err) {
                    showToast("error", "Error", "Central Matrix Connection Failure");
                }
            }
        });
    };

    const handleDeleteSubscription = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: "Record Decomposition",
            message: "Are you certain you wish to deconstruct this specific Subscription Record? Current organizational access may be suspended.",
            type: "warning",
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    const res = await fetch(`/api/plan-subscriptions?id=${id}`, { method: "DELETE" });
                    if (res.ok) {
                        showToast("success", "Success", "Subscription Record Decomposed");
                        fetchSubscriptions();
                    } else {
                        showToast("error", "Error", "Process Termination Failure");
                    }
                } catch (err) {
                    showToast("error", "Error", "Protocol Connection Error");
                }
            }
        });
    };

    const handleExport = () => {
        try {
            if (filteredSubscriptions.length === 0) {
                showToast("warning", "No Data", "There are no records to export.");
                return;
            }

            const dataToExport = filteredSubscriptions.map(sub => ({
                'ID': sub.id,
                'Organization': sub.organization_name,
                'Plan': sub.plan_name,
                'Type': sub.plan_type,
                'Amount': sub.amount,
                'Start Date': format(new Date(sub.start_date), "dd MMM, yyyy"),
                'End Date': sub.end_date ? format(new Date(sub.end_date), "dd MMM, yyyy") : 'N/A',
                'Payment Mode': sub.payment_mode || 'Offline',
                'Status': sub.status
            }));

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, activeTab === "plans" ? "Active Plans" : "Renewals");

            // Generate filename
            const timestamp = format(new Date(), "yyyy-MM-dd_HHmm");
            XLSX.writeFile(wb, `VisitorSystem_Billing_${activeTab}_${timestamp}.xlsx`);

            showToast("success", "Export Successful", "Billing report downloaded successfully.");
        } catch (error) {
            console.error("Export Error:", error);
            showToast("error", "Export Failed", "An error occurred while generating the Excel report.");
        }
    };

    // Check if organization already has an active plan
    const hasActivePlan = useMemo(() => {
        if (!selectedOrgId) return false;
        return subscriptions.some(s => s.organization_id === selectedOrgId && s.status === 'active');
    }, [selectedOrgId, subscriptions]);

    // Admin Restriction: Disable buy button if plan is active and > 7 days from expiry
    const isBuyDisabled = useMemo(() => {
        if (currSession?.role !== "ADMIN" || !currSession?.organization_id) return false;

        const activeSub = subscriptions.find(s =>
            String(s.organization_id) === String(currSession.organization_id) &&
            s.status === 'active'
        );

        if (!activeSub) return false;
        if (!activeSub.end_date) return true; // Lifetime/No expiry -> Disable

        const expiryDate = new Date(activeSub.end_date);
        const today = new Date();
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > 7;
    }, [subscriptions, currSession]);

    // Get ID of the current active plan for Admin organization
    const activePlanId = useMemo(() => {
        if (currSession?.role !== "ADMIN" || !currSession?.organization_id) return null;
        const activeSub = subscriptions.find(s =>
            String(s.organization_id) === String(currSession.organization_id) &&
            s.status === 'active'
        );
        return activeSub ? Number(activeSub.plan_id) : null;
    }, [subscriptions, currSession]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading Billing Matrix...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col space-y-6 overflow-hidden bg-background p-1">
            {/* NEW Header Layout - Standard Font Styling */}
            <div className="flex flex-col space-y-4 shrink-0">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                            <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground tracking-tight">Organization Billing</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">Enterprise Management Terminal</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TABS Directly Under Billing Title - Cleaner Styling */}
                <div className="flex items-center justify-start gap-1 p-1 bg-muted/40 backdrop-blur-sm rounded-xl border border-border/50 w-fit ml-2">
                    <button
                        onClick={() => setActiveTab("plans")}
                        className={`px-6 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${activeTab === "plans"
                            ? "bg-background text-foreground shadow-sm ring-1 ring-border/20 translate-y-[-1px]"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                    >
                        <Layout className="h-4 w-4" /> Organizations Plans
                    </button>
                    {currSession?.role === "SUPERADMIN" && (
                        <button
                            onClick={() => setActiveTab("renewals")}
                            className={`px-6 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${activeTab === "renewals"
                                ? "bg-background text-foreground shadow-sm ring-1 ring-border/20 translate-y-[-1px]"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                        >
                            <RefreshCcw className="h-4 w-4" /> Renewals
                        </button>
                    )}
                    {(currSession?.role === "SUPERADMIN" || currSession?.role === "ADMIN") && (
                        <button
                            onClick={() => setActiveTab("manage")}
                            className={`px-6 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${activeTab === "manage"
                                ? "bg-background text-foreground shadow-sm ring-1 ring-border/20 translate-y-[-1px]"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                        >
                            <Star className="h-4 w-4" /> Available Plans
                        </button>
                    )}
                </div>
            </div>

            {/* Main Table Area */}
            <div className="flex-1 bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0 relative">
                {/* Search & Plan Filter */}
                {activeTab !== "manage" && (
                    <div className="p-4 border-b border-border/30 flex flex-col lg:flex-row items-center justify-between bg-muted/20 sticky top-0 z-30 shrink-0 gap-4">
                        <div className="flex flex-wrap items-center gap-4 w-full">
                            <div className="relative group max-w-sm w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-primary" />
                                <input
                                    placeholder="Search records..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 text-xs font-medium border border-border/50 rounded-xl bg-background/50 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                />
                            </div>

                            <div className="flex items-center gap-2 bg-background/50 p-1 rounded-xl border border-border/50">
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setPlanFilter("All")}
                                        className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${planFilter === "All" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
                                            }`}
                                    >
                                        All
                                    </button>
                                    {plans.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setPlanFilter(p.plan_name)}
                                            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${planFilter === p.plan_name ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
                                                }`}
                                        >
                                            {p.plan_name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <Button
                                onClick={handleExport}
                                variant="outline"
                                size="sm"
                                className="h-10 rounded-2xl text-[10px] uppercase tracking-widest font-black gap-2 px-6 shadow-sm border-border/80 hover:bg-muted/50 transition-all"
                            >
                                <Download className="h-4 w-4" /> Export Report
                            </Button>
                            <Button
                                onClick={() => toggleBuyModal(true)}
                                size="sm"
                                disabled={isBuyDisabled}
                                className={`h-10 rounded-2xl text-[10px] uppercase tracking-widest font-black gap-2 px-8 shadow-xl transition-all ${isBuyDisabled
                                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50 shadow-none hover:scale-100"
                                    : "shadow-primary/20 bg-primary hover:scale-[1.05] active:scale-[0.95]"
                                    }`}
                            >
                                <Zap className={`h-4 w-4 ${isBuyDisabled ? "fill-muted-foreground" : "fill-white"}`} />
                                Buy a Plan
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-auto relative scrollbar-hide">
                    {activeTab === "plans" && filteredSubscriptions.length > 0 ? (
                        <table className="w-full text-left">
                            <thead className="sticky top-0 z-20 bg-muted/90 backdrop-blur-md border-b border-border/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider leading-none">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Organization</th>
                                    <th className="px-6 py-4 font-bold">Plan Tier</th>
                                    <th className="px-6 py-4 text-right font-bold">Pricing</th>
                                    <th className="px-6 py-4 font-bold">Start Date</th>
                                    <th className="px-6 py-4 text-center font-bold">Expiry</th>
                                    <th className="px-6 py-4 text-right pr-10 font-bold">Status</th>
                                    <th className="px-6 py-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/10">
                                {filteredSubscriptions.map(sub => (
                                    <tr key={sub.id} className="group hover:bg-primary/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-lg bg-primary/5 flex items-center justify-center text-primary/70 border border-primary/10">
                                                    <Building className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground tracking-tight leading-none uppercase">{sub.organization_name}</p>
                                                    <p className="text-[10px] font-medium text-muted-foreground/50 mt-1 uppercase tracking-wider italic">ID: #{sub.organization_id.split('-')[0]}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-foreground tracking-tight uppercase tracking-widest">{sub.plan_name}</span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Zap className="h-3 w-3 text-amber-500" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{sub.plan_type} Cycle</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm font-bold text-foreground tabular-nums">${Number(sub.amount).toFixed(2)}</span>
                                                <span className="text-[9px] font-medium text-muted-foreground/40 uppercase tracking-widest whitespace-nowrap">Monthly Billing</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-foreground/80">{format(new Date(sub.start_date), "dd MMM, yyyy")}</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 mt-0.5 whitespace-nowrap">Activated</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={`text-xs font-bold ${sub.end_date ? 'text-foreground/80' : 'text-primary animate-pulse'}`}>
                                                    {sub.end_date ? format(new Date(sub.end_date), "dd MMM, yyyy") : "LIFETIME"}
                                                </span>
                                                <span className="text-[9px] font-medium text-muted-foreground/40 uppercase tracking-wider mt-0.5">Expiring</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right pr-10">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${sub.status === 'active'
                                                ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20"
                                                : "bg-rose-500/5 text-rose-600 border-rose-500/20"
                                                }`}>
                                                <div className={`h-1.5 w-1.5 rounded-full ${sub.status === 'active' ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                                                {sub.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleDeleteSubscription(sub.id)}
                                                className="p-2 rounded-lg text-muted-foreground/30 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : activeTab === "renewals" && filteredSubscriptions.length > 0 ? (
                        <table className="w-full text-left">
                            <thead className="sticky top-0 z-20 bg-muted/90 backdrop-blur-md border-b border-border/40 text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                                <tr>
                                    <th className="px-6 py-4">S.No</th>
                                    <th className="px-6 py-4">Client Identity</th>
                                    <th className="px-6 py-4">Tier Breakdown</th>
                                    <th className="px-6 py-4 text-center">Payment Info</th>
                                    <th className="px-6 py-4">Live Status</th>
                                    <th className="px-6 py-4 text-right pr-6">System Timestamp</th>
                                    <th className="px-6 py-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/10">
                                {filteredSubscriptions.map((sub, idx) => (
                                    <tr key={sub.id} className="group hover:bg-primary/[0.02] transition-colors">
                                        <td className="px-6 py-4 font-bold text-[11px] text-muted-foreground/60">{idx + 1}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-sm uppercase">{sub.organization_name}</p>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold uppercase tracking-tight text-foreground/80">{sub.plan_name}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg border border-border/50">
                                                {sub.payment_mode === "credit" || sub.payment_mode === "debit" ? <CreditCard className="h-3 w-3 text-blue-500" /> :
                                                    sub.payment_mode === "upi" ? <Smartphone className="h-3 w-3 text-violet-500" /> :
                                                        <QrCode className="h-3 w-3 text-emerald-500" />}
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{sub.payment_mode || "offline"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">
                                            <div className="flex items-center gap-1.5">
                                                {sub.status === 'active' ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-rose-500" />}
                                                <span className={sub.status === 'active' ? "text-emerald-600" : "text-rose-600"}>{sub.status}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right pr-6">
                                            <p className="text-xs font-semibold text-foreground/80">{format(new Date(sub.created_at), "dd MMM, yyyy")}</p>
                                            <p className="text-[10px] text-muted-foreground/40 mt-0.5 italic">{format(new Date(sub.created_at), "HH:mm:ss")}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleDeleteSubscription(sub.id)}
                                                className="p-2 rounded-lg text-muted-foreground/30 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : activeTab === "manage" ? (
                        /* Master Plan Management Tab - Global Plan Inventory */
                        <div className="flex-1 overflow-auto p-4 lg:p-8">
                            <div className="max-w-[1400px] mx-auto space-y-12">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                    <div className="space-y-2">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                                            <span className="h-1 w-1 rounded-full bg-primary" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-primary">Master Configuration</span>
                                        </div>
                                        <h3 className="text-2xl font-extrabold text-foreground tracking-tight">Global Plan Inventory</h3>
                                        <p className="text-sm text-muted-foreground font-medium max-w-md">Oversee the core billing tiers and service packages distributed across the enterprise landscape.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                                    {plans.map((p, idx) => {
                                        const accents = [
                                            { text: "text-emerald-500", bg: "bg-emerald-500", border: "border-emerald-500/30" },
                                            { text: "text-blue-500", bg: "bg-blue-500", border: "border-blue-500/30" },
                                            { text: "text-fuchsia-500", bg: "bg-fuchsia-500", border: "border-fuchsia-500/30" }
                                        ];
                                        const theme = accents[idx % 3];

                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => !isBuyDisabled && toggleBuyModal(true, String(p.id))}
                                                className={`relative group bg-card border-2 ${theme.border} rounded-xl shadow-xl transition-all duration-500 flex flex-col items-center overflow-hidden h-full border-t-0 mx-auto w-full max-w-[340px] 
                                                    ${isBuyDisabled ? "opacity-60 cursor-not-allowed grayscale-[0.5]" : "cursor-pointer hover:shadow-2xl hover:border-primary/40"}`}
                                            >
                                                {/* Plan Tier Label */}
                                                <div className="pt-12 pb-6 text-center w-full">
                                                    <h4 className="text-xl font-black uppercase tracking-[0.2em] text-foreground/80">{p.plan_name}</h4>
                                                    <div className={`mt-3 mx-auto h-[3px] w-12 rounded-full ${theme.bg}`} />
                                                </div>

                                                {/* Features List with Checkmarks */}
                                                <div className="flex-1 w-full px-10 py-6 space-y-4">
                                                    {[
                                                        "Unlimited Visitor Terminal Access",
                                                        "Automated AI Face Detection",
                                                        "Real-time Enterprise Reports",
                                                        "Advanced RBAC Management",
                                                        "Cloud Log Retention Policy",
                                                        "Standard API Infrastructure"
                                                    ].map((feat, i) => (
                                                        <div key={i} className="flex items-start gap-3">
                                                            <Check className={`h-4 w-4 mt-0.5 shrink-0 ${theme.text}`} />
                                                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight leading-tight">{feat}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Large Pricing Display */}
                                                <div className="w-full text-center pt-8 pb-12">
                                                    <div className="flex items-center justify-center gap-1 group-hover:scale-110 transition-transform duration-500">
                                                        <span className="text-2xl font-black text-foreground/30 self-start mt-1">$</span>
                                                        <span className="text-4xl font-black text-foreground tracking-tighter tabular-nums">{Number(p.amount).toFixed(0)}</span>
                                                    </div>
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2">Per {p.plan_type.replace('ly', '')}</p>
                                                </div>

                                                {/* Bottom Buy Area with Wave Decors */}
                                                <div className={`w-full mt-auto p-10 relative overflow-hidden flex flex-col items-center justify-center translate-y-0 ${theme.bg}`}>
                                                    <div className="absolute inset-x-0 bottom-full h-16 overflow-hidden pointer-events-none">
                                                        <svg className="absolute bottom-[-2px] w-[200%] h-16 fill-current text-card opacity-20" viewBox="0 0 1000 100" preserveAspectRatio="none">
                                                            <path d="M0,50 C150,150 350,-50 500,50 C650,150 850,-50 1000,50 L1000,100 L0,100 Z" />
                                                        </svg>
                                                        <svg className="absolute bottom-[-2px] w-[200%] h-16 fill-current text-card opacity-30 ml-[-50%]" viewBox="0 0 1000 100" preserveAspectRatio="none">
                                                            <path d="M0,50 C150,-50 350,150 500,50 C650,-50 850,150 1000,50 L1000,100 L0,100 Z" />
                                                        </svg>
                                                    </div>

                                                    <button
                                                        disabled={isBuyDisabled}
                                                        className={`bg-background text-foreground px-12 py-4 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl transition-all relative z-10 selection:bg-transparent ${isBuyDisabled
                                                            ? "opacity-50 cursor-not-allowed scale-100"
                                                            : "group-hover:scale-110 active:scale-95 hover:bg-white hover:text-black dark:hover:bg-primary dark:hover:text-white"
                                                            }`}
                                                    >
                                                        {currSession?.role === "ADMIN" && activePlanId !== null
                                                            ? (p.id === activePlanId ? "Subscribed" : "Not Subscribed")
                                                            : "Buy Now"}
                                                    </button>

                                                    {/* Secure System Tags */}
                                                    {currSession?.role === "SUPERADMIN" && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeletePlan(p.id); }}
                                                            className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center bg-white/20 hover:bg-rose-500 rounded-xl transition-all text-white z-20"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-32 gap-6 opacity-40">
                            <div className="h-16 w-16 rounded-3xl bg-muted flex items-center justify-center">
                                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-foreground text-sm uppercase tracking-widest">
                                    {activeTab === "renewals" ? "No Renewals Found" : "No Data Found"}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-2 font-medium uppercase tracking-wider italic">
                                    {activeTab === "renewals"
                                        ? `The system identified no ${planFilter === "All" ? "" : planFilter + " "}renewal records.`
                                        : `No ${planFilter === "All" ? "" : planFilter + " "}subscriptions found in the current landscape.`}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Buy Plan Popup Modal - Now with Payment Flow */}
            {
                isBuyModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsBuyModalOpen(false)} />
                        <div className="relative bg-card border border-border w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-8 space-y-6 overflow-y-auto">
                                {/* Modal Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                            <Zap className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold tracking-tight">Checkout Terminal</h2>
                                            <p className="text-xs font-medium text-muted-foreground mt-0.5">Secure payment processing for enterprise licenses</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleBuyModal(false)}
                                        className="h-10 w-10 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground transition-all"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Modal Body - Stacked Layout */}
                                <div className="space-y-8">
                                    {/* Entity & Tier Configuration */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-muted/20 border border-border/50 rounded-[2.5rem]">
                                        {currSession?.role === "SUPERADMIN" ? (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Client Identification</label>
                                                <select
                                                    value={selectedOrgId}
                                                    onChange={(e) => setSelectedOrgId(e.target.value)}
                                                    className="w-full px-4 py-3.5 text-sm font-semibold border-2 border-muted bg-background rounded-2xl focus:outline-none focus:border-primary/30 transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="" disabled>Select Organization...</option>
                                                    {organizations
                                                        .filter(org => org.name !== 'System')
                                                        .filter(org => !subscriptions.some(s => s.organization_id === org.id && s.status === 'active'))
                                                        .map(org => (
                                                            <option key={org.id} value={org.id}>{org.name}</option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Active Identity</label>
                                                <div className="w-full px-5 py-3.5 bg-background border-2 border-emerald-500/20 rounded-2xl flex items-center justify-between">
                                                    <span className="text-sm font-black uppercase tracking-tight text-foreground">
                                                        {organizations.find(o => String(o.id) === String(currSession?.organization_id))?.name || "Enterprise Client"}
                                                    </span>
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subscription Tier</label>
                                            <select
                                                value={selectedPlanId}
                                                onChange={(e) => setSelectedPlanId(e.target.value)}
                                                className="w-full px-4 py-3.5 text-sm font-semibold border-2 border-muted bg-background rounded-2xl focus:outline-none focus:border-primary/30 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="" disabled>Select Plan Tier...</option>
                                                {plans.map(plan => (
                                                    <option key={plan.id} value={plan.id}>
                                                        {plan.plan_name} — ${plan.amount}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Payment Method Dropdown - Visible after plan selection */}
                                    {selectedPlanId && (
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Payment Protocol</label>
                                                <div className="relative group">
                                                    <select
                                                        value={paymentMode || ""}
                                                        onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                                                        className="w-full pl-12 pr-4 py-4 text-sm font-bold border-2 border-primary/20 bg-primary/5 rounded-2xl focus:outline-none focus:border-primary/40 transition-all appearance-none cursor-pointer text-primary"
                                                    >
                                                        <option value="" disabled>Select Payment Method...</option>
                                                        <option value="credit">Secure Credit Card</option>
                                                        <option value="debit">Secure Debit Card</option>
                                                        <option value="upi">Unified Payments Interface (UPI)</option>
                                                        <option value="qr">Static Terminal QR Scan</option>
                                                    </select>
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary">
                                                        {!paymentMode ? <ShieldCheck className="h-5 w-5" /> :
                                                            paymentMode === "upi" ? <Smartphone className="h-5 w-5" /> :
                                                                paymentMode === "qr" ? <QrCode className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                                                    </div>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 pointer-events-none" />
                                                </div>
                                            </div>

                                            {/* Dynamic Payment Details - Directly Under */}
                                            {paymentMode && (
                                                <div className="p-8 bg-muted/30 rounded-[2.5rem] border border-border/50">
                                                    {paymentMode === "credit" || paymentMode === "debit" ? (
                                                        <div className="space-y-5">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">Secure Card Entry Terminal</h4>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-4">
                                                                <div className="relative">
                                                                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                                                                    <input
                                                                        value={cardDetails.number}
                                                                        onChange={e => {
                                                                            const val = e.target.value.replace(/\D/g, "").slice(0, 16);
                                                                            const formatted = val.match(/.{1,4}/g)?.join(" ") || "";
                                                                            setCardDetails(prev => ({ ...prev, number: formatted }));
                                                                        }}
                                                                        maxLength={19}
                                                                        inputMode="numeric"
                                                                        placeholder="0000 0000 0000 0000"
                                                                        className="w-full pl-12 pr-4 py-3.5 text-sm font-semibold border border-border/50 rounded-xl bg-background shadow-inner focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                                                    />
                                                                </div>
                                                                <input
                                                                    value={cardDetails.name}
                                                                    onChange={e => setCardDetails(prev => ({ ...prev, name: e.target.value }))}
                                                                    placeholder="Name On Card"
                                                                    className="w-full px-4 py-3.5 text-sm font-semibold border border-border/50 rounded-xl bg-background shadow-inner focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                                                />
                                                                <div className="grid grid-cols-3 gap-3">
                                                                    <input
                                                                        value={cardDetails.month}
                                                                        onChange={e => setCardDetails(prev => ({ ...prev, month: e.target.value.replace(/\D/g, "").slice(0, 2) }))}
                                                                        maxLength={2}
                                                                        inputMode="numeric"
                                                                        placeholder="MM"
                                                                        className="px-4 py-3.5 text-sm font-semibold border border-border/50 rounded-xl bg-background shadow-inner text-center focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                                                    />
                                                                    <input
                                                                        value={cardDetails.year}
                                                                        onChange={e => setCardDetails(prev => ({ ...prev, year: e.target.value.replace(/\D/g, "").slice(0, 2) }))}
                                                                        maxLength={2}
                                                                        inputMode="numeric"
                                                                        placeholder="YY"
                                                                        className="px-4 py-3.5 text-sm font-semibold border border-border/50 rounded-xl bg-background shadow-inner text-center focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                                                    />
                                                                    <input
                                                                        value={cardDetails.cvv}
                                                                        onChange={e => setCardDetails(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
                                                                        maxLength={3}
                                                                        inputMode="numeric"
                                                                        placeholder="CVV"
                                                                        className="px-4 py-3.5 text-sm font-semibold border border-border/50 rounded-xl bg-background shadow-inner text-center focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : paymentMode === "upi" ? (
                                                        <div className="space-y-5">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">UPI Virtual Payment Address</h4>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <div className="relative flex-1">
                                                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-500" />
                                                                    <input
                                                                        placeholder="Username"
                                                                        value={upiId}
                                                                        onChange={e => setUpiId(e.target.value)}
                                                                        className="w-full pl-12 pr-4 py-4 text-sm font-bold border-2 border-violet-500/10 rounded-2xl bg-background focus:outline-none focus:ring-4 focus:ring-violet-500/5 transition-all"
                                                                    />
                                                                </div>
                                                                <div className="relative">
                                                                    <select
                                                                        value={upiHandle}
                                                                        onChange={(e) => setUpiHandle(e.target.value)}
                                                                        className="h-full px-4 pr-10 py-4 text-sm font-bold border-2 border-violet-500/10 rounded-2xl bg-background focus:outline-none focus:border-violet-500/30 transition-all appearance-none cursor-pointer text-violet-600 min-w-[100px]"
                                                                    >
                                                                        <option value="@axl">@axl</option>
                                                                        <option value="@ybl">@ybl</option>
                                                                        <option value="@paytm">@paytm</option>
                                                                        <option value="@okicici">@okicici</option>
                                                                        <option value="@okhdfcbank">@okhdfcbank</option>
                                                                    </select>
                                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-violet-400 pointer-events-none" />
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between px-2">
                                                                <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest italic">Instant Verification Protocol Active</span>
                                                                <Star className="h-3 w-3 text-violet-400" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-8 py-2">
                                                            <div className="flex flex-col items-center text-center gap-2">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Active Payment Terminal</h4>
                                                                </div>
                                                                <div className="flex flex-col items-center mt-1">
                                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Total Amount Payable</span>
                                                                    <div className="px-6 py-2.5 bg-emerald-500/10 text-emerald-600 rounded-[1.2rem] text-xl font-black border-2 border-emerald-500/20 shadow-inner">
                                                                        ${Number(plans.find(p => p.id === Number(selectedPlanId))?.amount).toFixed(2)}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="relative group">
                                                                <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/20 to-primary/20 rounded-[3rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                                                                <div className="relative p-8 bg-white rounded-[3rem] border-[16px] border-slate-50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] transition-all duration-500 hover:scale-[1.02]">
                                                                    <img
                                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`upi://pay?pa=enterprise@bank&pn=VisitorSystem&am=${plans.find(p => p.id === Number(selectedPlanId))?.amount}&cu=USD&tn=Plan_Subscription`)}&bgcolor=ffffff&color=1e293b&margin=10`}
                                                                        alt="Payment QR Code"
                                                                        className="h-56 w-56 rounded-2xl"
                                                                    />
                                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                                                                        <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-white">
                                                                            <Scan className="h-10 w-10 text-emerald-600 animate-bounce" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-center gap-2">
                                                                <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 rounded-full border border-border/50">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ready for Scan</span>
                                                                </div>
                                                                <p className="text-[10px] text-muted-foreground/30 font-bold uppercase tracking-widest italic text-center">Scan via any enterprise-supported payment application</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="mt-8 pt-8 border-t border-border/20">
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Total Settlement Due</span>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                                                    <span className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest">PCI-DSS Compliant Transaction</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-3xl font-black text-foreground tabular-nums tracking-tighter">${Number(plans.find(p => p.id === Number(selectedPlanId))?.amount).toFixed(2)}</span>
                                                                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-1 italic">Inc. Service Charges</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Modal Footer */}
                            <div className="flex gap-4 p-8 pt-0 shrink-0 border-t border-border/10">
                                <button
                                    onClick={() => toggleBuyModal(false)}
                                    className="flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all"
                                >
                                    Cancel Transaction
                                </button>
                                <button
                                    disabled={isSubmitting || !selectedOrgId || !selectedPlanId || !paymentMode}
                                    onClick={handleBuyPlan}
                                    className={`flex-1 flex items-center justify-center gap-3 py-4 text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl ${isSubmitting || !selectedOrgId || !selectedPlanId || !paymentMode
                                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                                        : "bg-primary text-white shadow-primary/20 hover:scale-[1.03] active:scale-[0.98]"
                                        }`}
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Process"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* CUSTOM CONFIRMATION MODAL - Redesigned to match Organizations style */}
            {
                confirmModal.isOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />
                        <div className="relative bg-card border border-border w-full max-w-sm rounded-[2rem] shadow-2xl p-8">
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className={`h-20 w-20 rounded-full flex items-center justify-center border-4 ${confirmModal.type === 'danger' ? 'bg-rose-100 dark:bg-rose-500/10 border-rose-50 text-rose-500' : 'bg-amber-100 dark:bg-amber-500/10 border-amber-50 text-amber-500'}`}>
                                    <AlertCircle className="h-10 w-10" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-foreground">{confirmModal.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{confirmModal.message}</p>
                                </div>
                                <div className="flex gap-3 w-full pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                        className="flex-1 h-12 rounded-xl text-xs font-bold uppercase tracking-widest"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={confirmModal.onConfirm}
                                        className={`flex-1 h-12 rounded-xl text-xs font-bold uppercase tracking-widest text-white shadow-lg ${confirmModal.type === 'danger' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-amber-500 hover:bg-amber-600'}`}
                                    >
                                        Confirm
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
