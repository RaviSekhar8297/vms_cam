"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/Toast";
import {
    Users as UsersIcon, Search, UserPlus, Loader2,
    Pencil, Trash2, X, CheckCheck, User, Mail, Plus,
    Phone, Building, Shield, ChevronLeft, ChevronRight,
    ToggleLeft, ToggleRight, CheckCircle2, XCircle, AlertTriangle,
    FileSpreadsheet, Download
} from "lucide-react";
import * as XLSX from "xlsx";

type UserRow = {
    id: string; name: string; email: string; phone?: string;
    role: string; is_active: boolean; org_name?: string;
    organization_id?: string;
    email_status?: boolean; phone_status?: boolean;
};

const ROLES = ["ADMIN", "EMPLOYEE", "RECEPTIONIST"];
const ROLE_COLORS: Record<string, string> = {
    SUPERADMIN: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400",
    ADMIN: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400",
    EMPLOYEE: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
    RECEPTIONIST: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400",
};

const STATUS_CHIP = (status?: boolean) =>
    status
        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400"
        : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500";

const PAGE_SIZE = 10;

// ─── Modal ────────────────────────────────────────────────────────────────────
function UserModal({ editUser, currentUser, onClose, onSaved }: { editUser: UserRow | null; currentUser: any; onClose: () => void; onSaved: () => void; }) {
    const [form, setForm] = useState({
        name: editUser?.name ?? "",
        email: editUser?.email ?? "",
        phone: editUser?.phone ?? "",
        password: "",
        role: editUser?.role ?? "EMPLOYEE",
        is_active: editUser?.is_active ?? true,
        email_status: editUser?.email_status ?? false,
        phone_status: editUser?.phone_status ?? false,
        organization_id: editUser?.organization_id ?? (currentUser?.role === "SUPERADMIN" ? "" : currentUser?.organization_id ?? ""),
    });
    const [organizations, setOrganizations] = useState<{ id: string, name: string }[]>([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);
    const [showQuickOrg, setShowQuickOrg] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchOrgs = () => {
        setLoadingOrgs(true);
        fetch("/api/organizations").then(r => r.json())
            .then(d => { setOrganizations(Array.isArray(d) ? d : []); setLoadingOrgs(false); })
            .catch(() => setLoadingOrgs(false));
    };

    useEffect(() => { fetchOrgs(); }, []);

    const handleQuickAddOrg = async () => {
        if (!newOrgName.trim()) return;
        try {
            const res = await fetch("/api/organizations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newOrgName }),
            });
            if (res.ok) {
                const data = await res.json();
                fetchOrgs();
                setForm(f => ({ ...f, organization_id: data.id }));
                setNewOrgName("");
                setShowQuickOrg(false);
                showToast("success", "Organization added");
            }
        } catch { showToast("error", "Failed to add organization"); }
    };

    const validate = () => {
        if (!form.name.trim()) { showToast("error", "Name required", "Please enter the user's full name."); return false; }
        if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) { showToast("error", "Invalid email", "Please enter a valid email address."); return false; }
        if (!editUser && !form.password) { showToast("error", "Password required", "Please set an initial password."); return false; }
        if (!form.role) { showToast("error", "Role required", "Please select a role."); return false; }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        try {
            const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
            const method = editUser ? "PUT" : "POST";
            const body = editUser
                ? {
                    name: form.name, email: form.email, phone: form.phone, role: form.role,
                    is_active: form.is_active, email_status: form.email_status, phone_status: form.phone_status,
                    organization_id: form.organization_id,
                    ...(form.password ? { password: form.password } : {})
                }
                : form;
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            showToast("success", editUser ? "User updated!" : "User created!", editUser ? `${form.name} has been updated.` : `${form.name} was added to the system.`);
            onSaved();
            onClose();
        } catch (err: any) {
            showToast("error", "Save failed", err.message);
        } finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-card z-10">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <UserPlus className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">{editUser ? `Edit: ${editUser.name}` : "Add New User"}</h2>
                            <p className="text-xs text-muted-foreground">{editUser ? "Update user details below" : "Fill in details to create a new system user"}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Row 1: Name + Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name
                            </label>
                            <input placeholder="e.g. Ravi Kumar" value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                className="w-full px-4 py-2.5 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone
                            </label>
                            <input placeholder="+91 9876543210" value={form.phone}
                                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                className="w-full px-4 py-2.5 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                            />
                        </div>
                    </div>

                    {/* Row 2: Email + Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
                            </label>
                            <input type="email" placeholder="user@company.com" value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                className="w-full px-4 py-2.5 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                                {editUser ? "New Password (optional)" : "Password"}
                            </label>
                            <input type="password" placeholder={editUser ? "Leave blank to keep" : "Set password"} value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                className="w-full px-4 py-2.5 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                            />
                        </div>
                    </div>

                    {/* Organization and Role selector */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                <Building className="h-3.5 w-3.5 text-muted-foreground" /> Organization
                            </label>
                            {currentUser?.role === "SUPERADMIN" ? (
                                <div className="flex items-center gap-2">
                                    <select
                                        value={form.organization_id}
                                        onChange={e => setForm(f => ({ ...f, organization_id: e.target.value }))}
                                        className="flex-1 px-4 py-2.5 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow outline-none"
                                    >
                                        <option value="">Select Organization</option>
                                        {organizations.map(o => (
                                            <option key={o.id} value={o.id}>{o.name}</option>
                                        ))}
                                    </select>
                                    <button type="button" onClick={() => setShowQuickOrg(!showQuickOrg)}
                                        className={`p-2.5 border rounded-xl transition-colors ${showQuickOrg ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted text-primary border-border'}`}>
                                        <Plus className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="px-4 py-2.5 text-sm border rounded-xl bg-muted/20 text-muted-foreground italic">
                                    {organizations.find(o => o.id === form.organization_id)?.name || "Current Organization"}
                                </div>
                            )}
                            {showQuickOrg && currentUser?.role === "SUPERADMIN" && (
                                <div className="mt-2 p-3 border rounded-xl bg-muted/30 flex gap-2 animate-in slide-in-from-top-1 duration-200">
                                    <input placeholder="New org name..." value={newOrgName} onChange={e => setNewOrgName(e.target.value)}
                                        className="flex-1 px-3 py-1.5 text-xs border rounded-lg bg-background outline-none" />
                                    <Button type="button" size="sm" className="h-8 rounded-lg" onClick={handleQuickAddOrg}>Add</Button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-muted-foreground" /> Role
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {ROLES.filter(r => currentUser?.role === "SUPERADMIN" || r !== "ADMIN").map(role => (
                                    <button type="button" key={role} onClick={() => setForm(f => ({ ...f, role }))}
                                        className={`px-2 py-2 rounded-xl border text-[10px] font-bold tracking-wide transition-all ${form.role === role ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20" : "bg-background text-muted-foreground border-border hover:bg-muted"}`}>
                                        {role}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Status row: email_status + phone_status + active (edit only) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Email Status */}
                        <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                            <div>
                                <p className="text-xs font-semibold">Email</p>
                                <p className="text-[10px] text-muted-foreground">{form.email_status ? "Allowed" : "Disabled"}</p>
                            </div>
                            <button type="button" onClick={() => setForm(f => ({ ...f, email_status: !f.email_status }))}>
                                {form.email_status
                                    ? <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                    : <XCircle className="h-6 w-6 text-slate-400" />}
                            </button>
                        </div>
                        {/* Phone Status */}
                        <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                            <div>
                                <p className="text-xs font-semibold">Phone</p>
                                <p className="text-[10px] text-muted-foreground">{form.phone_status ? "Allowed" : "Disabled"}</p>
                            </div>
                            <button type="button" onClick={() => setForm(f => ({ ...f, phone_status: !f.phone_status }))}>
                                {form.phone_status
                                    ? <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                    : <XCircle className="h-6 w-6 text-slate-400" />}
                            </button>
                        </div>
                        {/* Active (edit only) */}
                        <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                            <div>
                                <p className="text-xs font-semibold">Account</p>
                                <p className="text-[10px] text-muted-foreground">Active?</p>
                            </div>
                            <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
                                {form.is_active
                                    ? <ToggleRight className="h-7 w-7 text-emerald-500" />
                                    : <ToggleLeft className="h-7 w-7 text-slate-400" />}
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 pt-2 border-t">
                        <Button type="button" variant="outline" className="rounded-xl flex-1" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={submitting} className="rounded-xl flex-1 gap-2 shadow-md">
                            {submitting
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                                : editUser ? <><CheckCheck className="h-4 w-4" /> Update User</> : <><UserPlus className="h-4 w-4" /> Create User</>
                            }
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ user, onClose, onDeleted }: { user: UserRow; onClose: () => void; onDeleted: () => void }) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            showToast("success", "User deleted", `${user.name} has been removed.`);
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
                        <AlertTriangle className="h-7 w-7 text-rose-500" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-foreground">Delete User?</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Are you sure you want to delete <span className="font-semibold text-foreground">{user.name}</span>? This action cannot be undone.
                        </p>
                    </div>
                    <div className="flex gap-3 w-full">
                        <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
                        <Button disabled={deleting} className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white gap-2 shadow-md" onClick={handleDelete}>
                            {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</> : <><Trash2 className="h-4 w-4" /> Delete</>}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Users() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [currSession, setCurrSession] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null); // userId-field
    const [page, setPage] = useState(1);
    const [modalMode, setModalMode] = useState<"add" | "edit" | "delete" | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

    const fetchSession = useCallback(() => {
        fetch("/api/auth/me").then(r => r.json())
            .then(data => setCurrSession(data.user?.user || data.user))
            .catch(() => { });
    }, []);

    const fetchUsers = useCallback(() => {
        setLoading(true);
        fetch("/api/users").then(r => r.json())
            .then(d => { setUsers(Array.isArray(d) ? d : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => { fetchUsers(); fetchSession(); }, [fetchUsers, fetchSession]);
    useEffect(() => { setPage(1); }, [searchQuery]);

    const handleToggleStatus = async (user: UserRow, field: "email_status" | "phone_status" | "is_active") => {
        // RBAC Check
        if (currSession?.role === "SUPERADMIN") {
            // Allowed
        } else if (currSession?.role === "ADMIN") {
            if (user.organization_id !== currSession.organization_id) {
                showToast("error", "Unauthorized", "You can only manage users in your organization.");
                return;
            }
            if (field === "phone_status") {
                showToast("error", "Unauthorized", "Admins cannot toggle phone status.");
                return;
            }
        } else {
            showToast("error", "Unauthorized", "You do not have permission to change status.");
            return;
        }

        const updateKey = `${user.id}-${field}`;
        try {
            setUpdatingStatus(updateKey);
            const newValue = !user[field];
            const res = await fetch(`/api/users/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...user, [field]: newValue }),
            });
            if (!res.ok) throw new Error("Toggle failed");
            await fetchUsers();
            showToast("success", "Status updated", user.name);
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleExportExcel = () => {
        if (filtered.length === 0) {
            showToast("error", "No data to export");
            return;
        }

        const exportData = filtered.map(u => ({
            "User Name": u.name,
            "Email": u.email,
            "Phone": u.phone || "—",
            "Role": u.role,
            "Organization": u.org_name || "System Wide",
            "Status": u.is_active ? "Active" : "Inactive"
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Users");

        const fileName = `Users_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showToast("success", "Exported successfully", fileName);
    };

    const filtered = users.filter(u => {
        const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.role?.toLowerCase().includes(searchQuery.toLowerCase());

        // If session not loaded yet, don't filter by org (API already does it)
        if (!currSession) return matchesSearch;

        if (currSession.role === "SUPERADMIN") return matchesSearch;

        // Non-superadmins only see users in their organization
        return u.organization_id === currSession.organization_id && matchesSearch;
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500 overflow-hidden">
            {/* Header */}
            <div className="bg-card px-6 py-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <UsersIcon className="h-5 w-5 text-indigo-500" /> Users
                    </h2>
                    <p className="text-muted-foreground text-xs mt-0.5">Manage system users and their roles.</p>
                </div>
                {["SUPERADMIN", "ADMIN"].includes(currSession?.role) && (
                    <Button onClick={() => { setSelectedUser(null); setModalMode("add"); }}
                        className="rounded-xl gap-2 shadow-md hover:shadow-lg transition-all" size="sm">
                        <UserPlus className="h-4 w-4" /> Add User
                    </Button>
                )}
            </div>

            {/* Table card */}
            <div className="flex-1 min-h-0 bg-card rounded-2xl border shadow-sm overflow-hidden flex flex-col">
                {/* Search bar */}
                <div className="p-3 border-b bg-muted/10 flex items-center gap-3 shrink-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input placeholder="Search by name, email or role..." value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                        />
                    </div>
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                            <X className="h-3.5 w-3.5" /> Clear
                        </button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportExcel}
                        className="rounded-lg h-9 gap-2 text-xs font-semibold hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                    >
                        <FileSpreadsheet className="h-4 w-4" /> Export Excel
                    </Button>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</span>
                </div>

                {/* Table */}
                <div className="flex-1 min-h-0 overflow-auto relative">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[11px] text-muted-foreground/70 uppercase font-semibold tracking-wider bg-muted/90 backdrop-blur-sm border-b sticky top-0 z-10 border-border/40">
                            <tr>
                                <th className="px-5 py-4 font-semibold">User</th>
                                <th className="px-5 py-4 font-semibold">Role</th>
                                <th className="px-5 py-4 font-semibold hidden lg:table-cell">Organization</th>
                                <th className="px-5 py-4 font-semibold hidden md:table-cell">Email</th>
                                <th className="px-5 py-4 font-semibold hidden md:table-cell">Phone</th>
                                <th className="px-5 py-4 font-semibold">Status</th>
                                <th className="px-5 py-4 font-semibold text-right pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading || !currSession ? (
                                <tr><td colSpan={7} className="py-16 text-center">
                                    <div className="flex justify-center items-center gap-3">
                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                        <span className="text-muted-foreground">Loading users...</span>
                                    </div>
                                </td></tr>
                            ) : paged.length === 0 ? (
                                <tr><td colSpan={7} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-4 bg-muted/50 rounded-full"><UsersIcon className="h-7 w-7 text-muted-foreground/50" /></div>
                                        <p className="font-medium text-foreground">
                                            {searchQuery ? `No results for "${searchQuery}"` : "No users yet"}
                                        </p>
                                        {!searchQuery && ["SUPERADMIN", "ADMIN"].includes(currSession?.role) && (
                                            <Button size="sm" className="rounded-lg gap-2" onClick={() => { setSelectedUser(null); setModalMode("add"); }}>
                                                <UserPlus className="h-3.5 w-3.5" /> Add User
                                            </Button>
                                        )}
                                    </div>
                                </td></tr>
                            ) : paged.map(u => (
                                <tr key={u.id} className="hover:bg-muted/10 transition-all duration-300 group">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&color=fff&size=80&bold=true`}
                                                alt={u.name} className="h-9 w-9 rounded-xl object-cover border border-border shrink-0 shadow-sm" />
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm text-foreground tracking-tight leading-tight truncate">{u.name}</p>
                                                <p className="text-[11px] text-muted-foreground font-medium">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border ${ROLE_COLORS[u.role] || ROLE_COLORS.EMPLOYEE}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 hidden lg:table-cell text-muted-foreground text-sm">
                                        {u.org_name || <span className="text-xs italic px-2 py-0.5 bg-muted rounded-md border">System Wide</span>}
                                    </td>
                                    {/* Email Status */}
                                    <td className="px-5 py-3 hidden md:table-cell">
                                        <button
                                            disabled={updatingStatus === `${u.id}-email_status`}
                                            onClick={() => {
                                                if (currSession?.role === "SUPERADMIN") handleToggleStatus(u, "email_status");
                                                else if (currSession?.role === "ADMIN" && u.organization_id === currSession.organization_id) handleToggleStatus(u, "email_status");
                                            }}
                                            className={`flex items-center gap-1.5 transition-all active:scale-90 ${(["SUPERADMIN"].includes(currSession?.role) || (currSession?.role === "ADMIN" && u.organization_id === currSession.organization_id)) ? "hover:scale-105 cursor-pointer" : "cursor-default opacity-80"}`}>
                                            <span className={`relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase font-bold border ${STATUS_CHIP(u.email_status)} transition-all duration-300 min-w-[85px] justify-center`}>
                                                {updatingStatus === `${u.id}-email_status` ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : u.email_status ? (
                                                    <CheckCircle2 className="h-3 w-3 text-emerald-500 animate-in zoom-in-50 duration-300" />
                                                ) : (
                                                    <XCircle className="h-3 w-3 text-slate-400 animate-in zoom-in-50 duration-300" />
                                                )}
                                                {updatingStatus === `${u.id}-email_status` ? "..." : (u.email_status ? "Allowed" : "Disabled")}
                                            </span>
                                        </button>
                                    </td>
                                    {/* Phone Status */}
                                    <td className="px-5 py-3 hidden md:table-cell">
                                        <button
                                            disabled={updatingStatus === `${u.id}-phone_status`}
                                            onClick={() => {
                                                if (currSession?.role === "SUPERADMIN") handleToggleStatus(u, "phone_status");
                                                else if (currSession?.role === "ADMIN" && u.organization_id === currSession.organization_id) handleToggleStatus(u, "phone_status");
                                            }}
                                            className={`flex items-center gap-1.5 transition-all active:scale-90 ${(["SUPERADMIN"].includes(currSession?.role) || (currSession?.role === "ADMIN" && u.organization_id === currSession.organization_id)) ? "hover:scale-105 cursor-pointer" : "cursor-default opacity-80"}`}>
                                            <span className={`relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase font-bold border ${STATUS_CHIP(u.phone_status)} transition-all duration-300 min-w-[85px] justify-center`}>
                                                {updatingStatus === `${u.id}-phone_status` ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : u.phone_status ? (
                                                    <CheckCircle2 className="h-3 w-3 text-emerald-500 animate-in zoom-in-50 duration-300" />
                                                ) : (
                                                    <XCircle className="h-3 w-3 text-slate-400 animate-in zoom-in-50 duration-300" />
                                                )}
                                                {updatingStatus === `${u.id}-phone_status` ? "..." : (u.phone_status ? "Allowed" : "Disabled")}
                                            </span>
                                        </button>
                                    </td>
                                    {/* Active status */}
                                    <td className="px-5 py-3">
                                        <button
                                            disabled={updatingStatus === `${u.id}-is_active`}
                                            onClick={() => {
                                                if (currSession?.role === "SUPERADMIN") handleToggleStatus(u, "is_active");
                                                else if (currSession?.role === "ADMIN" && u.organization_id === currSession.organization_id) handleToggleStatus(u, "is_active");
                                            }}
                                            className={`flex items-center gap-1.5 transition-all active:scale-90 ${(["SUPERADMIN"].includes(currSession?.role) || (currSession?.role === "ADMIN" && u.organization_id === currSession.organization_id)) ? "hover:scale-105 cursor-pointer" : "cursor-default opacity-80"}`}>
                                            <span className={`relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase font-bold border ${u.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400"} transition-all duration-300 min-w-[75px] justify-center`}>
                                                {updatingStatus === `${u.id}-is_active` ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                                                )}
                                                {updatingStatus === `${u.id}-is_active` ? "..." : (u.is_active ? "Active" : "Inactive")}
                                            </span>
                                        </button>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {((currSession?.role === "SUPERADMIN") || (currSession?.role === "ADMIN" && u.organization_id === currSession.organization_id)) ? (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                        onClick={() => { setSelectedUser(u); setModalMode("edit"); }} title="Edit">
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50"
                                                        onClick={() => { setSelectedUser(u); setModalMode("delete"); }} title="Delete">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest border border-border/50 px-2 py-1 rounded bg-muted/30">
                                                    View Only
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filtered.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/10 text-sm">
                        <span className="text-muted-foreground text-xs">
                            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
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

            {/* Modals */}
            {(modalMode === "add" || modalMode === "edit") && (
                <UserModal
                    editUser={modalMode === "edit" ? selectedUser : null}
                    currentUser={currSession}
                    onClose={() => setModalMode(null)}
                    onSaved={fetchUsers}
                />
            )}
            {modalMode === "delete" && selectedUser && (
                <DeleteModal
                    user={selectedUser}
                    onClose={() => setModalMode(null)}
                    onDeleted={fetchUsers}
                />
            )}
        </div>
    );
}
