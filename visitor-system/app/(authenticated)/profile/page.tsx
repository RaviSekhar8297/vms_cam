"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showToast } from "@/components/Toast";
import { 
    User, Mail, Phone, Lock, Eye, EyeOff, 
    Camera, ShieldCheck, CheckCircle2, AlertCircle,
    Loader2
} from "lucide-react";

export default function Profile() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [isOldPasswordVerified, setIsOldPasswordVerified] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false });

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        user_image: ""
    });

    const [passwordData, setPasswordData] = useState({
        old_password: "",
        new_password: "",
        confirm_password: ""
    });

    const fetchProfile = useCallback(() => {
        setLoading(true);
        fetch("/api/users/profile")
            .then((res) => res.json())
            .then((data) => {
                if (data && !data.error) {
                    setUser(data);
                    setFormData({
                        name: data.name || "",
                        email: data.email || "",
                        phone: data.phone || "",
                        user_image: data.user_image || ""
                    });
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === "phone") {
            // Only allow numbers and max 10 digits
            const cleaned = value.replace(/\D/g, "").slice(0, 10);
            setFormData((prev) => ({ ...prev, [name]: cleaned }));
            return;
        }
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSaveProfile = async (dataToSave: any) => {
        setSaving(true);
        try {
            const res = await fetch("/api/users/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dataToSave),
            });

            const data = await res.json();
            if (res.ok) {
                showToast("success", "Profile updated successfully!");
                setUser(data);
                setIsEditing(false);
                router.refresh();
            } else {
                showToast("error", data.error || "Failed to update profile.");
            }
        } catch (error) {
            console.error(error);
            showToast("error", "An error occurred while saving profile.");
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!validTypes.includes(file.type)) {
                showToast("error", "Please upload only JPG, JPEG, or PNG images.");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Image = reader.result as string;
                setFormData(prev => ({ ...prev, user_image: base64Image }));
                // Auto-save image
                handleSaveProfile({ user_image: base64Image });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdatePersonalDetails = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!formData.name.trim()) {
            showToast("error", "Name cannot be empty.");
            return;
        }

        if (!formData.email.trim()) {
            showToast("error", "Email address cannot be empty.");
            return;
        }

        // Basic email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            showToast("error", "Please enter a valid email address.");
            return;
        }

        // Phone validation: Exact 10 digits, starts with 6, 7, 8, 9
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(formData.phone)) {
            showToast("error", "Phone number must be 10 digits and start with 6, 7, 8, or 9.");
            return;
        }

        handleSaveProfile({
            name: formData.name,
            email: formData.email,
            phone: formData.phone
        });
    };

    const verifyOldPassword = async () => {
        if (!passwordData.old_password) return;
        setVerifying(true);
        try {
            // We use the same PUT endpoint but with just the old password to verify
            // Or we could have a specific verify endpoint. 
            // For now let's just use the current password check in PUT but as a dry run if we want, 
            // but simpler is to just have a check. 
            // I'll just assume verification happens on the final Change Password click for now, 
            // but the screenshot shows a "Verify" button.
            
            const res = await fetch("/api/auth/verify-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: passwordData.old_password }),
            });

            if (res.ok) {
                setIsOldPasswordVerified(true);
                showToast("success", "Password verified!");
            } else {
                showToast("error", "Incorrect old password.");
            }
        } catch (error) {
            showToast("error", "Verification failed.");
        } finally {
            setVerifying(false);
        }
    };

    const handleChangePassword = async () => {
        if (!passwordData.new_password || !passwordData.confirm_password) {
            showToast("error", "Please fill all password fields.");
            return;
        }
        if (passwordData.new_password !== passwordData.confirm_password) {
            showToast("error", "New passwords do not match.");
            return;
        }
        if (passwordData.new_password.length < 6) {
            showToast("error", "Password must be at least 6 characters.");
            return;
        }

        setChangingPassword(true);
        try {
            const res = await fetch("/api/users/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    password: passwordData.new_password,
                    old_password: passwordData.old_password
                }),
            });

            const data = await res.json();
            if (res.ok) {
                showToast("success", "Password changed successfully!");
                setPasswordData({ old_password: "", new_password: "", confirm_password: "" });
                setIsOldPasswordVerified(false);
            } else {
                showToast("error", data.error || "Failed to change password.");
            }
        } catch (error) {
            showToast("error", "An error occurred.");
        } finally {
            setChangingPassword(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Loading your profile...</p>
        </div>
    );

    if (user?.role === "SUPERADMIN") {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                <div className="p-6 bg-rose-500/10 rounded-full">
                    <AlertCircle className="h-12 w-12 text-rose-500" />
                </div>
                <h2 className="text-2xl font-bold">Access Denied</h2>
                <p className="text-muted-foreground max-w-md">
                    The profile management page is not available for Super Admin accounts. 
                    Please use the User Management section to manage administrative credentials.
                </p>
                <Button onClick={() => router.push('/dashboard')} variant="outline" className="mt-4 rounded-xl">
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-auto lg:h-full lg:overflow-hidden space-y-4 md:space-y-6 animate-in fade-in duration-500 p-0 md:p-1">
            {/* Header */}
            <div className="bg-card px-4 md:px-8 py-6 rounded-2xl border border-border/50 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 shrink-0 relative overflow-hidden group mx-2 md:mx-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                
                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                    <div className="relative group/avatar">
                        <div className="h-28 w-28 rounded-2xl overflow-hidden border-4 border-background shadow-2xl relative">
                            <img 
                                src={formData.user_image || `https://ui-avatars.com/api/?name=${user?.name || "U"}&background=4f46e5&color=fff&size=256&bold=true`}
                                alt={user?.name}
                                className="h-full w-full object-cover transition-transform group-hover/avatar:scale-110 duration-500"
                            />
                            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer">
                                <Camera className="h-8 w-8 text-white" />
                                <input type="file" className="hidden" accept=".jpg,.jpeg,.png" onChange={handleImageUpload} />
                            </label>
                        </div>
                        <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-emerald-500 border-4 border-card rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                    </div>

                    <div className="text-center md:text-left space-y-1 md:space-y-2">
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground uppercase tracking-tight">
                            {user?.name || "Loading..."}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-lg border border-primary/20">
                                {user?.role}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 relative z-10">
                    <div className="px-4 py-2 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-emerald-500/20 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active Profile
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 flex-1 min-h-0 mx-2 md:mx-0 pb-6 md:pb-0">
                {/* Personal Information */}
                <div className="lg:col-span-3 bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 md:px-8 py-4 md:py-6 border-b border-border/10 bg-muted/5 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-violet-500" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold tracking-tight">Personal Details</h3>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">Identity & Communication</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpdatePersonalDetails} className="p-6 md:p-8 space-y-6 md:space-y-8 lg:overflow-y-auto custom-scrollbar">
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <User className="h-3.5 w-3.5" /> Full Name
                            </label>
                            <Input 
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                disabled={!isEditing}
                                placeholder="Enter your full name"
                                className="h-14 rounded-2xl border-border/50 bg-muted/20 focus:bg-background focus:ring-primary/20 transition-all font-semibold text-base disabled:opacity-70 disabled:grayscale-[0.5]"
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5" /> Email Address
                            </label>
                            <Input 
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={!isEditing}
                                placeholder="name@company.com"
                                className="h-14 rounded-2xl border-border/50 bg-muted/20 focus:bg-background focus:ring-primary/20 transition-all font-semibold text-base disabled:opacity-70 disabled:grayscale-[0.5]"
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5" /> Phone Number
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1 group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none z-10">
                                        <span className="text-base font-bold text-muted-foreground/60">+91</span>
                                        <div className="h-4 w-px bg-border/50" />
                                    </div>
                                    <Input 
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        placeholder="Enter 10 digits"
                                        className="h-14 pl-20 rounded-2xl border-border/50 bg-muted/20 focus:bg-background focus:ring-primary/20 transition-all font-semibold text-base w-full disabled:opacity-70 disabled:grayscale-[0.5]"
                                    />
                                </div>
                                {isEditing ? (
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <Button 
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setIsEditing(false);
                                                setFormData({
                                                    name: user.name || "",
                                                    email: user.email || "",
                                                    phone: user.phone || "",
                                                    user_image: user.user_image || ""
                                                });
                                            }}
                                            className="h-14 sm:h-11 rounded-2xl px-6 border-border/50 text-muted-foreground font-bold uppercase tracking-widest text-[9px] transition-all flex-1 sm:flex-none"
                                        >
                                            Cancel
                                        </Button>
                                        <Button 
                                            type="submit" 
                                            disabled={saving}
                                            className="h-14 sm:h-11 rounded-2xl px-8 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-[9px] shadow-sm transition-all flex-1 sm:flex-none"
                                        >
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                                        </Button>
                                    </div>
                                ) : (
                                    <Button 
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className="h-14 sm:h-11 rounded-2xl px-8 bg-primary/10 hover:bg-primary/20 text-primary font-bold uppercase tracking-widest text-[9px] transition-all w-full sm:w-auto"
                                    >
                                        Edit Details
                                    </Button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>

                {/* Security Section */}
                <div className="lg:col-span-2 bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 md:px-8 py-4 md:py-6 border-b border-border/10 bg-muted/5 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                            <Lock className="h-5 w-5 text-rose-500" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold tracking-tight">Security</h3>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">Access Protection</p>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 space-y-6 flex-1 flex flex-col">
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Old Password</label>
                            <div className="relative group">
                                <Input 
                                    name="old_password"
                                    type={showPasswords.old ? "text" : "password"}
                                    value={passwordData.old_password}
                                    onChange={handlePasswordChange}
                                    placeholder="Enter current password"
                                    disabled={isOldPasswordVerified}
                                    className="h-14 rounded-2xl border-border/50 bg-muted/20 focus:bg-background pr-32 font-bold tracking-[0.2em]"
                                />
                                <button 
                                    onClick={() => setShowPasswords(p => ({ ...p, old: !p.old }))}
                                    className="absolute right-20 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-2"
                                >
                                    {showPasswords.old ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                                <button 
                                    type="button"
                                    onClick={verifyOldPassword}
                                    disabled={!passwordData.old_password || verifying || isOldPasswordVerified}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-xl transition-all ${
                                        isOldPasswordVerified 
                                        ? "bg-emerald-500/10 text-emerald-500" 
                                        : "bg-primary/5 text-primary hover:bg-primary/10 disabled:opacity-50"
                                    }`}
                                >
                                    {verifying ? <Loader2 className="h-3 w-3 animate-spin" /> : (isOldPasswordVerified ? "Verified" : "Verify")}
                                </button>
                            </div>
                            {isOldPasswordVerified && (
                                <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest pl-1 mt-1 block">Once verified your old password then update new password</p>
                            )}
                        </div>

                        <div className={`space-y-6 transition-all duration-500 ${isOldPasswordVerified ? "opacity-100 translate-y-0" : "opacity-30 pointer-events-none"}`}>
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">New Password</label>
                                <div className="relative group">
                                    <Input 
                                        name="new_password"
                                        type={showPasswords.new ? "text" : "password"}
                                        value={passwordData.new_password}
                                        onChange={handlePasswordChange}
                                        placeholder="Min 6 characters..."
                                        className="h-14 rounded-2xl border-border/50 bg-muted/20 focus:bg-background pr-12 font-bold tracking-[0.2em]"
                                    />
                                    <button 
                                        onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-2"
                                    >
                                        {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <p className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-widest italic pl-1">6-12 characters, include A-Z, a-z, 0-9, and . @ #</p>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Confirm New Password</label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1 group">
                                        <Input 
                                            name="confirm_password"
                                            type={showPasswords.confirm ? "text" : "password"}
                                            value={passwordData.confirm_password}
                                            onChange={handlePasswordChange}
                                            placeholder="Re-enter new password"
                                            className="h-14 rounded-2xl border-border/50 bg-muted/20 focus:bg-background pr-12 font-bold tracking-[0.2em]"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-2"
                                        >
                                            {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <Button 
                                        disabled={!isOldPasswordVerified || changingPassword || !passwordData.confirm_password || passwordData.new_password !== passwordData.confirm_password}
                                        onClick={handleChangePassword}
                                        className="h-14 sm:h-11 rounded-2xl px-6 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-[9px] shadow-sm transition-all shrink-0 min-w-full sm:min-w-[120px]"
                                    >
                                        {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-4 flex justify-end">
                            <Button 
                                variant="ghost" 
                                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-rose-500 transition-colors"
                                onClick={() => {
                                    setPasswordData({ old_password: "", new_password: "", confirm_password: "" });
                                    setIsOldPasswordVerified(false);
                                }}
                            >
                                Reset Security Fields
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
