"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/Toast";
import {
    Building, Search, PlusCircle,
    Pencil, Loader2, AlertTriangle, CheckCheck,
    X, ToggleLeft, ToggleRight, MapPin,
    ChevronLeft, ChevronRight, Trash2, AlertCircle
} from "lucide-react";

type Org = {
    id: string; name: string; address: string;
    is_permission: boolean; created_at: string;
};

const PAGE_SIZE = 8;

export default function Organizations() {
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Org | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [user, setUser] = useState<any>(null);

    const fetchUser = useCallback(() => {
        fetch("/api/auth/me").then(r => r.json())
            .then(data => setUser(data.user?.user || data.user))
            .catch(() => { });
    }, []);

    const fetchOrgs = useCallback(() => {
        setLoading(true);
        fetch("/api/organizations").then(r => r.json())
            .then(d => { setOrgs(Array.isArray(d) ? d : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => { fetchOrgs(); fetchUser(); }, [fetchOrgs, fetchUser]);
    useEffect(() => { setPage(1); }, [searchQuery]);

    const filtered = orgs.filter(o => {
        const isSystem = o.name?.toLowerCase() === "system";
        const matchesSearch = o.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.address?.toLowerCase().includes(searchQuery.toLowerCase());

        if (!user) return !isSystem && matchesSearch;
        if (user.role === "SUPERADMIN") return !isSystem && matchesSearch;
        return !isSystem && o.id === user.organization_id && matchesSearch;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const openAdd = () => {
        setSelectedOrg(null);
        setIsModalOpen(true);
    };

    const openEdit = (org: Org) => {
        setSelectedOrg(org);
        setIsModalOpen(true);
    };

    const handleTogglePermission = async (org: Org) => {
        try {
            await fetch(`/api/organizations/${org.id}`, {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...org, is_permission: !org.is_permission }),
            });
            fetchOrgs();
            showToast("success", `Permission ${!org.is_permission ? "enabled" : "disabled"}`, org.name);
        } catch { showToast("error", "Update failed"); }
    };

    const handleModalSave = () => {
        fetchOrgs();
        setIsModalOpen(false);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/organizations/${deleteTarget.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            showToast("success", "Deleted!", `${deleteTarget.name} has been removed.`);
            fetchOrgs();
            setDeleteTarget(null);
        } catch (err: any) {
            showToast("error", "Delete failed", err.message);
        } finally { setDeleting(false); }
    };

    return (
        <>
            <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500 overflow-hidden relative">
                {/* Header */}
                <div className="bg-card px-6 py-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Building className="h-5 w-5 text-primary" /> Organizations
                        </h2>
                        <p className="text-muted-foreground text-xs mt-0.5">Manage your onboarded companies and facility branches.</p>
                    </div>
                    {user?.role === "SUPERADMIN" && (
                        <Button onClick={openAdd} className="rounded-xl gap-2 shadow-md hover:shadow-lg transition-all" size="sm">
                            <PlusCircle className="h-4 w-4" /> Add Organization
                        </Button>
                    )}
                </div>

                {/* Main Content Area (No Tabs) */}
                <div className="flex-1 min-h-0 bg-card rounded-2xl border shadow-sm flex flex-col overflow-hidden">
                    <div className="p-3 border-b bg-muted/10 flex items-center gap-3 shrink-0">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input placeholder="Search organizations..." value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                            />
                        </div>
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                                <X className="h-3.5 w-3.5" /> Clear
                            </button>
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
                    </div>

                    <div className="flex-1 min-h-0 overflow-auto relative">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[11px] text-muted-foreground/70 uppercase font-semibold tracking-wider bg-muted/30 border-b border-border/40">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">Organization</th>
                                    <th className="px-5 py-3 font-semibold hidden md:table-cell">Location</th>
                                    <th className="px-5 py-3 font-semibold">Permission</th>
                                    <th className="px-5 py-3 font-semibold">Status</th>
                                    <th className="px-5 py-3 font-semibold text-right pr-10">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading || !user ? (
                                    <tr><td colSpan={5} className="py-16 text-center">
                                        <div className="flex justify-center items-center gap-3">
                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                            <span className="text-muted-foreground">Loading...</span>
                                        </div>
                                    </td></tr>
                                ) : paged.length === 0 ? (
                                    <tr><td colSpan={5} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-muted/50 rounded-full"><Building className="h-7 w-7 text-muted-foreground/50" /></div>
                                            <p className="font-medium text-foreground">{searchQuery ? `No results for "${searchQuery}"` : "No organizations yet"}</p>
                                            {!searchQuery && user?.role === "SUPERADMIN" && <Button size="sm" className="rounded-lg gap-2" onClick={openAdd}><PlusCircle className="h-3.5 w-3.5" /> Add Organization</Button>}
                                        </div>
                                    </td></tr>
                                ) : paged.map(org => {
                                    const canEditLink = user?.role === "SUPERADMIN";
                                    return (
                                        <tr key={org.id} className="hover:bg-muted/10 transition-all duration-300 group">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                                        {org.name?.charAt(0)?.toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-sm text-foreground tracking-tight truncate">{org.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 hidden md:table-cell">
                                                <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                                                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                    {org.address || <span className="italic text-xs">No address</span>}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold">
                                                    {user?.role === "SUPERADMIN" ? (
                                                        <button onClick={() => handleTogglePermission(org)} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                                                            {org.is_permission
                                                                ? <ToggleRight className="h-6 w-6 text-emerald-500" />
                                                                : <ToggleLeft className="h-6 w-6 text-slate-400" />}
                                                            <span className={org.is_permission ? "text-emerald-600" : "text-rose-500"}>
                                                                {org.is_permission ? "Allowed" : "Disabled"}
                                                            </span>
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            {org.is_permission
                                                                ? <span className="text-emerald-500 font-bold">Enabled</span>
                                                                : <span className="text-rose-500 font-bold">Disabled</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border ${org.is_permission
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400"
                                                    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400"}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${org.is_permission ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                                                    {org.is_permission ? "Active" : "Disabled"}
                                                </span>
                                            </td>
                                             <td className="px-5 py-3 text-right">
                                                 {canEditLink ? (
                                                     <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => openEdit(org)} title="Edit">
                                                             <Pencil className="h-3.5 w-3.5" />
                                                         </Button>
                                                         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50" onClick={() => setDeleteTarget(org)} title="Delete">
                                                             <Trash2 className="h-3.5 w-3.5" />
                                                         </Button>
                                                     </div>
                                                 ) : (
                                                     <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest border border-border/50 px-2 py-1 rounded bg-muted/30">
                                                         View Only
                                                     </span>
                                                 )}
                                             </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {filtered.length > PAGE_SIZE && (
                        <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/10 text-sm shrink-0">
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
            </div >

            {/* Org Modal (Add/Edit) */}
            {isModalOpen && (
                <OrgModal
                    org={selectedOrg}
                    onClose={() => setIsModalOpen(false)}
                    onSaved={handleModalSave}
                />
            )}

            {/* Delete confirm modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
                    <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="h-14 w-14 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                                <AlertTriangle className="h-7 w-7 text-rose-500" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold">Delete Organization?</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget.name}</span>? This cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full">
                                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                                <Button disabled={deleting} className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white gap-2 shadow-md" onClick={handleDelete}>
                                    {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</> : <><Trash2 className="h-4 w-4" /> Delete</>}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Organization Modal (Add / Edit) ──────────────────────────────────────────
function OrgModal({ org, onClose, onSaved }: { org: Org | null; onClose: () => void; onSaved: () => void }) {
    const isEdit = !!org;
    const [form, setForm] = useState({
        name: org?.name || "",
        address: org?.address || "",
        is_permission: org ? org.is_permission : true
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { showToast("error", "Name required"); return; }
        setSubmitting(true); setError("");
        try {
            const url = isEdit ? `/api/organizations/${org.id}` : "/api/organizations";
            const method = isEdit ? "PUT" : "POST";
            const res = await fetch(url, {
                method, headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save");
            showToast("success", isEdit ? "Organization updated!" : "Organization created!",
                isEdit ? `${form.name}'s details saved.` : `${form.name} was added.`);
            onSaved();
        } catch (err: any) {
            setError(err.message);
            showToast("error", "Save failed", err.message);
        } finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            {isEdit ? <Pencil className="h-4 w-4 text-primary" /> : <PlusCircle className="h-4 w-4 text-primary" />}
                        </div>
                        <div>
                            <h2 className="text-base font-bold">{isEdit ? "Edit Organization" : "Add Organization"}</h2>
                            <p className="text-xs text-muted-foreground">{isEdit ? "Update company details" : "Register a new company"}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold flex items-center gap-1.5"><Building className="h-3.5 w-3.5 text-muted-foreground" /> Name</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Organization name"
                            className="w-full px-4 py-2 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Address</label>
                        <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={3}
                            placeholder="Full address"
                            className="w-full px-4 py-2 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                        <div>
                            <p className="text-sm font-semibold">Permission</p>
                            <p className="text-[10px] text-muted-foreground">Allow system access</p>
                        </div>
                        <button type="button" onClick={() => setForm(f => ({ ...f, is_permission: !f.is_permission }))}>
                            {form.is_permission ? <ToggleRight className="h-8 w-8 text-emerald-500" /> : <ToggleLeft className="h-8 w-8 text-slate-400" />}
                        </button>
                    </div>
                    {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
                    <div className="flex gap-3 pt-2 border-t">
                        <Button type="button" variant="outline" className="rounded-xl flex-1" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={submitting} className="rounded-xl flex-1 gap-2">
                            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><CheckCheck className="h-4 w-4" /> {isEdit ? "Save Changes" : "Create Organization"}</>}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
