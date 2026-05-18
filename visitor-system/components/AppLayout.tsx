"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
export default function AppLayout({ children, user }: { children: React.ReactNode, user: any }) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <div className="flex h-[100dvh] w-full bg-background text-foreground transition-colors duration-300 antialiased overflow-hidden fixed inset-0">
            {/* Sidebar - fixed height, no scroll on mobile but scrollable nav */}
            <Sidebar user={user} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

            {/* Right side: header + scrollable body */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-muted/20">
                <Header user={user} setIsMobileOpen={setIsMobileOpen} />
                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-[1700px] mx-auto w-full p-4 lg:p-6">
                        {children}
                    </div>
                </main>
                <Footer className="border-t border-border/50 bg-background shrink-0" />
            </div>
        </div>
    );
}
