"use client";

import { Menu, LogOut, Moon, Sun, Bell } from "lucide-react";
import { Button } from "./ui/button";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Clock, Calendar } from "lucide-react";

export default function Header({ user, setIsMobileOpen }: any) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isDark, setIsDark] = useState(false);

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        setMounted(true);
        setIsDark(document.documentElement.classList.contains("dark"));
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const toggleTheme = () => {
        const root = document.documentElement;
        if (root.classList.contains("dark")) {
            root.classList.remove("dark");
            setIsDark(false);
        } else {
            root.classList.add("dark");
            setIsDark(true);
        }
    };

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        sessionStorage.removeItem("jwt_token");
        sessionStorage.removeItem("session_date");
        window.location.href = "/login";
    };

    const todayDate = format(new Date(), "EEEE, MMMM do, yyyy");
    const currentUser = user?.user || user;

    return (
        <header className="w-full h-20 border-b border-border/50 bg-card/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-10 sticky top-0 z-30 shadow-sm transition-all">
            {/* Left side */}
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0 pr-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                    onClick={() => setIsMobileOpen(true)}
                >
                    <Menu className="h-6 w-6" />
                </Button>
                <div className="hidden sm:flex flex-col bg-muted/30 px-2 py-1 md:px-4 md:py-1.5 rounded-xl border border-border/40 backdrop-blur-sm gap-0.5 shadow-sm min-w-0">
                    {mounted ? (
                        <>
                            <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                                <Clock className="h-2.5 w-2.5 md:h-3 md:w-3 text-emerald-500 shrink-0" />
                                <span className="text-muted-foreground font-black text-[9px] md:text-sm lg:text-base tracking-widest font-mono leading-tight truncate">
                                    {format(currentTime, "HH:mm:ss")}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                                <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3 text-violet-500 shrink-0" />
                                <span className="text-foreground font-bold text-[8px] md:text-[10px] lg:text-[11px] tracking-tight leading-tight truncate">
                                    {format(currentTime, "EEEE, MMMM do, yyyy")}
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="h-8 w-20 md:h-10 md:w-32 animate-pulse bg-muted/50 rounded-lg shrink-0" />
                    )}
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1 sm:gap-4 md:gap-6 shrink-0">
                <div className="flex items-center gap-0.5 sm:gap-2">
                    <Button variant="ghost" size="icon" className="hover:bg-muted h-9 w-9 md:h-10 md:w-10 rounded-full relative">
                        <Bell className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                        <span className="absolute top-2 right-2.5 h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-red-500 ring-2 ring-card" />
                    </Button>

                    <Button variant="ghost" size="icon" className="hover:bg-muted h-9 w-9 md:h-10 md:w-10 rounded-full" onClick={toggleTheme}>
                        {mounted && isDark ? <Sun className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" /> : <Moon className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />}
                    </Button>
                </div>

                <div className="w-px h-8 bg-border hidden sm:block"></div>

                <div className="flex items-center gap-2 md:gap-3">
                    <div className="hidden md:flex flex-col text-right max-w-[150px]">
                        <span className="text-xs lg:text-sm font-bold text-foreground leading-none truncate whitespace-nowrap">{currentUser?.name || "Admin User"}</span>
                        <span className="text-[10px] lg:text-xs text-muted-foreground mt-1 whitespace-nowrap">{currentUser?.role || "SUPERADMIN"}</span>
                    </div>

                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full border border-border/50 overflow-hidden shrink-0 shadow-sm">
                        {currentUser?.user_image ? (
                            <img src={currentUser.user_image} alt={currentUser.name} className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs md:text-base">
                                {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                        )}
                    </div>

                    <Button variant="ghost" size="icon" className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors rounded-full h-9 w-9 md:h-10 md:w-10" onClick={handleLogout} title="Logout">
                        <LogOut className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
