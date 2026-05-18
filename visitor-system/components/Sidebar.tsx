"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
    LayoutDashboard,
    Building,
    Users,
    BookOpen,
    Power,
    CreditCard,
    UserCircle,
    Eye,
    PlusCircle,
} from "lucide-react";

export default function Sidebar({ user, isMobileOpen, setIsMobileOpen }: any) {
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        setMounted(true);

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

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        sessionStorage.removeItem("jwt_token");
        sessionStorage.removeItem("session_date");
        window.location.href = "/login";
    };

    const navItems = [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            href: "/dashboard",
        },
        {
            label: "Profile",
            icon: UserCircle,
            href: "/profile",
        },
        {
            label: "Organizations",
            icon: Building,
            href: "/organizations",
        },
        {
            label: "Users",
            icon: Users,
            href: "/users",
        },
        {
            label: "Visitors",
            icon: BookOpen,
            href: "/visitors",
        },
        {
            label: "Plans",
            icon: CreditCard,
            href: "/plans",
        },
        {
            label: "View",
            icon: Eye,
            href: "/cview",
        },
        {
            label: "Add",
            icon: PlusCircle,
            href: "/avms",
        },
    ];

    const currentUser = user?.user || user;
    const filteredNav = navItems.filter(item => {
        if (!currentUser) return true;
        
        // Profile is for everyone EXCEPT SuperAdmin
        if (item.label === "Profile") {
            return currentUser.role !== "SUPERADMIN";
        }

        // View and Add are ONLY for SuperAdmin
        if (["View", "Add"].includes(item.label)) {
            return currentUser.role === "SUPERADMIN";
        }

        if (currentUser.role === "EMPLOYEE") {
            return ["Dashboard", "Organizations", "Users", "Visitors"].includes(item.label);
        }
        if (currentUser.role === "RECEPTIONIST") {
            return ["Dashboard", "Organizations", "Users", "Visitors"].includes(item.label);
        }
        // Only Admin (and SuperAdmin if added) see Plans
        if (item.label === "Plans") {
            return ["SUPERADMIN", "ADMIN"].includes(currentUser.role);
        }
        return true;
    });

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden ${isMobileOpen ? "block" : "hidden"}`}
                onClick={() => setIsMobileOpen(false)}
            />

            {/* Sidebar */}
            <div
                className={`fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border/50 shadow-sm transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen flex flex-col ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                {/* Logo Section */}
                <div className="h-20 flex items-center px-4 bg-card/50 backdrop-blur-xl">
                    <div className="flex items-center justify-center w-full">
                        {mounted ? (
                            <div className="group/logo relative w-full h-14 transition-all duration-500 overflow-hidden flex items-center justify-center bg-transparent">
                                {/* Hover Glow */}
                                <div className="absolute inset-0 bg-indigo-500/0 group-hover/logo:bg-indigo-500/5 blur-xl transition-all duration-700 rounded-full" />

                                <img
                                    src={isDark ? "/images/whitelogo.jpeg" : "/images/bluelogo.png"}
                                    alt="Anthea Logo"
                                    className={`w-full h-full object-contain p-2 relative z-10 transition-all duration-500 transform group-hover/logo:scale-105`}
                                />
                            </div>
                        ) : (
                            <div className="h-14 w-full bg-muted animate-pulse rounded-xl" />
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
                    {filteredNav.map((item) => {
                        const Icon = item.icon;

                        const isActive =
                            pathname.startsWith(item.href) &&
                            (item.href !== "/visitors" ||
                                pathname === "/visitors" ||
                                pathname.startsWith("/visitors/edit"));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={`flex items-center px-4 py-3 rounded-xl transition-all group ${isActive
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                            >
                                <Icon
                                    className={`w-[20px] h-[20px] mr-4 transition-colors ${isActive
                                        ? "text-primary-foreground"
                                        : "text-muted-foreground group-hover:text-foreground"
                                        }`}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                                <span className={`font-medium tracking-wide text-sm ${isActive ? "font-bold" : ""}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* User Profile */}
                <div className="p-4 mt-auto border-t border-border/50 bg-card/50 backdrop-blur-md">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/10 shadow-inner group/profile transition-all hover:bg-muted/60">
                        <div className="relative">
                            <img
                                src={currentUser?.user_image || `https://ui-avatars.com/api/?name=${currentUser?.name || "U"}&background=4f46e5&color=fff&size=128&bold=true`}
                                alt={currentUser?.name || "User"}
                                className="h-10 w-10 rounded-xl object-cover shrink-0 shadow-sm border border-white/5"
                            />
                            <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-emerald-500 border-2 border-card rounded-full shadow-sm" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-foreground truncate uppercase tracking-tight">
                                {currentUser?.name || "Admin User"}
                            </p>
                            <p className="text-[9px] text-muted-foreground truncate font-bold uppercase tracking-widest mt-0.5 opacity-60">
                                {currentUser?.role || "System"}
                            </p>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="shrink-0 h-8 w-8 rounded-lg bg-background hover:bg-rose-500 hover:text-white transition-all border border-border/50 shadow-sm flex items-center justify-center group/logout"
                            title="Logout"
                        >
                            <Power className="h-3.5 w-3.5 transform group-hover/logout:rotate-12 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}