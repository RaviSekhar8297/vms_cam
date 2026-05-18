"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/Toast";
import Footer from "@/components/Footer";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validations with Toast
        if (!username.trim() || !password.trim()) {
            showToast("warning", "Missing Credentials", "Please enter both username and password");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const contentType = res.headers.get("content-type");
            const isJson = contentType && contentType.includes("application/json");
            const data = isJson ? await res.json() : null;

            if (!res.ok) {
                const errorMessage = data?.error || data?.details || `Server Error: ${res.status} ${res.statusText}`;
                throw new Error(errorMessage);
            }

            // Save JWT Token to sessionStorage if present
            if (data.token) {
                sessionStorage.setItem("jwt_token", data.token);
                sessionStorage.setItem("session_date", new Date().toLocaleString());
            }

            router.push("/dashboard");
            router.refresh();
        } catch (err: any) {
            showToast("error", "Login Failed", err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                <div className="max-w-5xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-slate-200">

                    {/* Left side: Illustration */}
                <div className="w-full md:w-1/2 bg-indigo-50 flex items-center justify-center p-8 md:p-12 border-r border-slate-100">
                    <img
                        src="/welcome_illustration.png"
                        alt="Welcome Illustration"
                        className="w-full h-auto max-w-[450px] object-contain drop-shadow-xl animate-in fade-in zoom-in duration-1000"
                    />
                </div>

                {/* Right side: Login Form */}
                <div className="w-full md:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
                    <div className="max-w-sm w-full mx-auto">
                        <div className="mb-10 text-center md:text-left">
                            <h1 className="text-4xl font-black text-indigo-950 tracking-tight">Login</h1>
                            <p className="text-slate-500 mt-2 font-medium">Please login to continue</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-8" noValidate>
                            <div className="space-y-10">
                                {/* Username Input */}
                                <div className="group">
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Username or ID"
                                        className="w-full bg-transparent border-0 border-b-2 border-slate-200 py-3 text-lg font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all duration-300 peer"
                                    />
                                    <div className="h-0.5 w-0 bg-indigo-500 transition-all duration-300 group-focus-within:w-full"></div>
                                </div>

                                {/* Password Input */}
                                <div className="group relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Password"
                                        className="w-full bg-transparent border-0 border-b-2 border-slate-200 py-3 text-lg font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all duration-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-3 text-slate-400 hover:text-indigo-500 transition-colors p-2"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                    <div className="h-0.5 w-0 bg-indigo-500 transition-all duration-300 group-focus-within:w-full"></div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold shadow-[0_10px_30px_-5px_rgba(79,70,229,0.3)] transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-70"
                                >
                                    {loading ? "Signing in..." : "Login"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            </div>
            <div className="fixed bottom-0 w-full z-50 bg-slate-50/90 backdrop-blur-sm">
                <Footer className="pb-2 pt-2 border-t border-slate-200" />
            </div>
        </div>
    );
}
