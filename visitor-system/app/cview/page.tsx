"use client";

import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { Camera, Shield, UserCheck, AlertCircle, Maximize2, Activity, Zap, Info, Loader2 } from "lucide-react";
import Footer from "@/components/Footer";

export default function CViewPage() {
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [isDark, setIsDark] = useState(false);
    const [isDetecting, setIsDetecting] = useState(true);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isStreamActive, setIsStreamActive] = useState(false);
    const [faceMatcher, setFaceMatcher] = useState<any>(null);
    const [detections, setDetections] = useState<any[]>([]);
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const [faceLogs, setFaceLogs] = useState<any[]>([]);
    const lastLoggedName = useRef<string>("");
    const lastLogTime = useRef<number>(0);

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

    useEffect(() => {
        // Load JSMpeg and FaceAPI scripts
        const loadScripts = async () => {
            const jsmpegScript = document.createElement("script");
            jsmpegScript.src = "https://cdn.jsdelivr.net/gh/phoboslab/jsmpeg/jsmpeg.min.js";
            jsmpegScript.async = true;
            document.body.appendChild(jsmpegScript);

            const faceapiScript = document.createElement("script");
            faceapiScript.src = "/face-api.min.js";
            faceapiScript.async = true;
            document.body.appendChild(faceapiScript);

            jsmpegScript.onload = () => {
                if (canvasRef.current) {
                    try {
                        // @ts-ignore
                        new JSMpeg.Player("ws://127.0.0.1:9997", {
                            canvas: canvasRef.current,
                            autoplay: true,
                            disableGl: true, // Force 2D context for compatibility with face-api.js
                            onPlay: () => setIsStreamActive(true),
                        });
                    } catch (err) {
                        console.error("JSMpeg Player Error:", err);
                    }
                }
            };

            faceapiScript.onload = async () => {
                console.log("Face Intelligence: Loading models...");
                // @ts-ignore
                const faceapi = window.faceapi;
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
                    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
                ]);
                setIsModelsLoaded(true);
                console.log("Face Intelligence: Models loaded successfully");
                
                // Load reference images
                try {
                    const imgNames = await fetch('/api/visitors-images').then(r => r.json());
                    const labeledDescriptors = [];
                    
                    console.log(`Face Intelligence: Loading ${imgNames.length} reference images`);
                    for (const name of imgNames) {
                        try {
                            console.log(`Face Intelligence: Fetching ${name}...`);
                            const img = await faceapi.fetchImage(`/api/visitors-images/${name}`);
                            console.log(`Face Intelligence: Analyzing ${name}...`);
                            const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
                            if (detection) {
                                labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(name, [detection.descriptor]));
                                console.log(`Face Intelligence: ✅ Loaded reference for ${name}`);
                            } else {
                                console.warn(`Face Intelligence: ⚠️ No face found in ${name}`);
                            }
                        } catch (e) {
                            console.error("Face Intelligence: ❌ Error processing reference image:", name, e);
                        }
                    }

                    if (labeledDescriptors.length > 0) {
                        setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.6));
                        console.log("Face Intelligence: 🚀 Face Matcher initialized and ready");
                    } else {
                        console.error("Face Intelligence: ❌ No valid reference faces found in the folder");
                    }
                } catch (err) {
                    console.error("Failed to load reference images:", err);
                }
            };
        };

        loadScripts();
    }, []);

    const initFaceMatcher = async () => {
        // @ts-ignore
        const faceapi = window.faceapi;
        if (!faceapi) return;

        try {
            const imgNames = await fetch('/api/visitors-images').then(r => r.json());
            const labeledDescriptors = [];
            
            console.log(`Face Intelligence: Loading ${imgNames.length} reference images`);
            for (const name of imgNames) {
                try {
                    const img = await faceapi.fetchImage(`/api/visitors-images/${name}`);
                    // Use TinyFaceDetector for reference images (much better for small/cropped images)
                    const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.1 }))
                        .withFaceLandmarks()
                        .withFaceDescriptors();
                        
                    if (detections.length > 0) {
                        // Use the best detection from the crop
                        labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(name, [detections[0].descriptor]));
                    } else {
                        console.warn(`Face Intelligence: ⚠️ Failed to re-detect face in reference ${name}. Image might be too small or blurry.`);
                    }
                } catch (e) {
                    console.error("Face Intelligence: Error processing reference image:", name, e);
                }
            }

            if (labeledDescriptors.length > 0) {
                const matcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
                setFaceMatcher(matcher);
                console.log("Face Intelligence: Face Matcher initialized");
                return matcher;
            }
        } catch (err) {
            console.error("Failed to load reference images:", err);
        }
        return null;
    };

    useEffect(() => {
        if (isModelsLoaded) {
            initFaceMatcher();
        }
    }, [isModelsLoaded]);

    const isLearning = useRef(false);

    // Fetch logs from DB
    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/face-logs');
            const data = await res.json();
            if (Array.isArray(data)) setFaceLogs(data);
        } catch (err) {
            console.error("Failed to fetch logs:", err);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, []);

    // Face detection loop
    useEffect(() => {
        if (!isModelsLoaded || !isStreamActive || !canvasRef.current) return;

        let isRunning = true;

        const runDetection = async () => {
            if (!isRunning) return;

            // @ts-ignore
            const faceapi = window.faceapi;
            if (!faceapi || !canvasRef.current) {
                setTimeout(runDetection, 1000);
                return;
            }

            try {
                const results = await faceapi.detectAllFaces(canvasRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                if (results.length > 0) {
                    const mappedResults = await Promise.all(results.map(async (res: any) => {
                        let label = "Unknown";
                        let confidence = res.detection.score;
                        
                        let bestMatch = faceMatcher ? faceMatcher.findBestMatch(res.descriptor) : { label: 'unknown' };
                        
                        if (bestMatch.label !== 'unknown') {
                            label = bestMatch.label.replace(/\.[^/.]+$/, "").toUpperCase();
                        } else if (!isLearning.current) {
                            // UNKNOWN person detected - learn them!
                            isLearning.current = true;
                            console.log("Face Intelligence: Unknown face detected, starting learning process...");
                            
                            try {
                                const faceCanvas = document.createElement('canvas');
                                const { x, y, width, height } = res.detection.box;
                                
                                // Add 30% padding for maximum context
                                const padX = width * 0.3;
                                const padY = height * 0.3;
                                
                                faceCanvas.width = width + (padX * 2);
                                faceCanvas.height = height + (padY * 2);
                                
                                const ctx = faceCanvas.getContext('2d');
                                if (ctx && canvasRef.current) {
                                    ctx.drawImage(
                                        canvasRef.current, 
                                        Math.max(0, x - padX), Math.max(0, y - padY), 
                                        width + (padX * 2), height + (padY * 2), 
                                        0, 0, faceCanvas.width, faceCanvas.height
                                    );
                                    const faceImage = faceCanvas.toDataURL('image/jpeg', 0.9);
                                    
                                    const resp = await fetch('/api/learn-unknown', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ image: faceImage })
                                    });
                                    const data = await resp.json();
                                    
                                    if (data.label) {
                                        console.log("Face Intelligence: Successfully learned new person:", data.label);
                                        await initFaceMatcher();
                                    }
                                }
                            } catch (err) {
                                console.error("Face Intelligence: Learning error:", err);
                            } finally {
                                setTimeout(() => { isLearning.current = false; }, 10000); 
                            }
                        }

                        // LOGIC: Handle knowns vs unknowns
                        if (label !== "Unknown") {
                            const now = Date.now();
                            const isActuallyKnown = !label.startsWith("UNKNOWN_");
                            
                            if (confidence > 0.75 && (label !== lastLoggedName.current || now - lastLogTime.current > 10000)) {
                                lastLoggedName.current = label;
                                lastLogTime.current = now;
                                
                                // Capture face image from canvas
                                let faceImage = "";
                                if (canvasRef.current) {
                                    try {
                                        const faceCanvas = document.createElement('canvas');
                                        const { x, y, width, height } = res.detection.box;
                                        faceCanvas.width = width;
                                        faceCanvas.height = height;
                                        const ctx = faceCanvas.getContext('2d');
                                        if (ctx) {
                                            ctx.drawImage(canvasRef.current, x, y, width, height, 0, 0, width, height);
                                            faceImage = faceCanvas.toDataURL('image/jpeg', 0.8);
                                        }
                                    } catch (e) {
                                        console.error("Face Intelligence: Crop error:", e);
                                    }
                                }

                                if (faceImage) {
                                    const endpoint = isActuallyKnown ? '/api/face-logs' : '/api/face-logs?skipDb=true';
                                    fetch(endpoint, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ 
                                            visitor_name: label, 
                                            confidence: confidence * 100,
                                            image: faceImage
                                        })
                                    }).then(async r => {
                                        const newLog = await r.json();
                                        if (!isActuallyKnown) {
                                            setFaceLogs(prev => [newLog, ...prev.slice(0, 49)]);
                                        } else {
                                            fetchLogs();
                                        }
                                    }).catch(err => console.error("Face Intelligence: Logging error:", err));
                                }
                            }
                        }
                        return { ...res, label };
                    }));
                    setDetections(mappedResults);
                } else {
                    setDetections([]);
                }
            } catch (err) {
                console.error("Face Intelligence: Detection loop error:", err);
            }

            setTimeout(runDetection, 1000);
        };

        runDetection();
        return () => { isRunning = false; };
    }, [isModelsLoaded, isStreamActive, faceMatcher]);

    return (
        <div className="fixed inset-0 z-[500] bg-[#FAFAFA] dark:bg-slate-950 flex flex-col h-screen overflow-hidden font-sans">
            {/* Premium Header */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-b border-border/50 px-8 lg:px-12 py-6 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="h-14 w-44 relative flex items-center justify-center p-3 rounded-2xl bg-card border border-border/50 shadow-sm transition-colors">
                        <img src={isDark ? "/images/whitelogo.jpeg" : "/images/bluelogo.png"} alt="Anthea Logo" className="h-full w-full object-contain" />
                    </div>
                    <div className="h-10 w-[1px] bg-border/40 mx-2 lg:mx-4" />
                    <div>
                        <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight leading-none mb-1">
                            Face <span className="text-primary">Intelligence</span>
                        </h1>
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Status: Active • Cam 15</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    <div className="hidden md:flex flex-col items-end h-10 justify-center text-right border-border/50 pr-2">
                        <p className="text-xl font-bold text-foreground tabular-nums tracking-tighter leading-none mb-1">
                            {currentTime ? format(currentTime, "HH:mm:ss") : "--:--:--"}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none opacity-80">
                            {currentTime ? format(currentTime, "EEEE, dd MMM yyyy") : "..."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content - Live Stream & Analytics */}
            <div className="flex-1 min-h-0 bg-slate-50/10 dark:bg-slate-900/10 p-6 lg:p-8 flex gap-8">
                {/* Left Side - Large Video Stream */}
                <div className="flex-1 flex flex-col gap-6">
                    <div className="flex-1 bg-card border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl relative group ring-1 ring-border/20">
                        {/* Stream Background */}
                        <div className="absolute inset-0 bg-black flex items-center justify-center">
                            {/* RTSP Stream Canvas */}
                            <canvas 
                                ref={canvasRef}
                                className={`w-full h-full object-cover transition-opacity duration-1000 ${isStreamActive ? "opacity-100" : "opacity-0"}`}
                            />
                            
                            {/* Face Detection Boxes Overlay */}
                            <div className="absolute inset-0 pointer-events-none">
                                {detections.map((det, idx) => {
                                    const { x, y, width, height } = det.detection.box;
                                    return (
                                        <div key={idx} style={{ 
                                            position: 'absolute', 
                                            left: `${(x / 1280) * 100}%`, 
                                            top: `${(y / 720) * 100}%`, 
                                            width: `${(width / 1280) * 100}%`, 
                                            height: `${(height / 720) * 100}%`,
                                            border: '2px solid',
                                            borderColor: det.label !== 'Unknown' ? '#10b981' : '#f43f5e',
                                            borderRadius: '8px'
                                        }}>
                                            <span style={{
                                                position: 'absolute',
                                                top: '-25px',
                                                left: '0',
                                                backgroundColor: det.label !== 'Unknown' ? '#10b981' : '#f43f5e',
                                                color: 'white',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '10px',
                                                fontWeight: 'bold',
                                                textTransform: 'uppercase'
                                            }}>{det.label}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Loading / Offline Overlay */}
                            {!isStreamActive && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                    <Activity className="h-16 w-16 text-primary animate-pulse mb-4" />
                                    <h3 className="text-xl font-black text-white uppercase tracking-[0.2em]">RTSP Live Feed</h3>
                                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-2">Connecting to secure stream...</p>
                                    <div className="mt-8 flex gap-3">
                                        <div className="px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                            <span className="text-[9px] font-black text-white uppercase tracking-widest">172.23.0.100</span>
                                        </div>
                                        <div className="px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center gap-2">
                                            <Zap className="h-3 w-3 text-yellow-500" />
                                            <span className="text-[9px] font-black text-white uppercase tracking-widest">Low Latency</span>
                                        </div>
                                    </div>
                                    <p className="mt-8 text-[9px] font-bold text-primary/40 uppercase tracking-[0.3em]">Ensure rtsp-bridge.js is running</p>
                                </div>
                            )}

                            {/* Model Loading Status */}
                            {!isModelsLoaded && isStreamActive && (
                                <div className="absolute top-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-card/80 backdrop-blur-md border border-border/50 rounded-2xl flex items-center gap-3">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">Loading AI Models...</p>
                                </div>
                            )}
                        </div>

                        {/* Corner Controls */}
                        <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
                                <Maximize2 className="h-4 w-4 text-white" />
                            </button>
                        </div>

                        {/* Stream Info Bottom */}
                        <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-primary/20 backdrop-blur-xl border border-primary/30 flex items-center justify-center">
                                        <Camera className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white uppercase tracking-widest mb-1">Face Comparison View</p>
                                        <p className="text-[9px] font-medium text-white/40 uppercase tracking-[0.2em]">Live Stream • 1080p • 30fps</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-white uppercase tracking-widest mb-1">Detection Confidence</p>
                                        <div className="h-1.5 w-32 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary w-[94%] shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Intelligence Sidebar */}
                <div className="w-96 flex flex-col gap-6">
                    {/* Face Comparison Results */}
                    <div className="flex-1 bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-sm flex flex-col gap-8 overflow-hidden relative">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <UserCheck className="h-4 w-4 text-primary" />
                                </div>
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Real-time Matching</h3>
                            </div>
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {faceLogs.filter(log => {
                                const logDate = new Date(log.log_date);
                                const today = new Date();
                                return logDate.toDateString() === today.toDateString();
                            }).length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-20 grayscale">
                                    <UserCheck className="h-12 w-12 mb-4" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">No Matches Logged</p>
                                </div>
                            ) : faceLogs
                                .filter(log => {
                                    const logDate = new Date(log.log_date);
                                    const today = new Date();
                                    return logDate.toDateString() === today.toDateString();
                                })
                                .map((log, i) => (
                                    <div key={log.id || i} className="p-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 transition-colors flex items-center gap-4 group">
                                        <div className="h-12 w-12 rounded-xl overflow-hidden relative border-2 border-emerald-500 bg-background flex items-center justify-center">
                                            {log.captured_image ? (
                                                <img 
                                                    src={`/api/face-logs/image/${log.captured_image}`} 
                                                    alt={log.visitor_name}
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => {
                                                        // @ts-ignore
                                                        e.target.src = ""; // Clear src to trigger fallback
                                                        // @ts-ignore
                                                        e.target.className = "hidden";
                                                    }}
                                                />
                                            ) : (
                                                <UserCheck className="h-full w-full p-3 text-emerald-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm font-black uppercase text-emerald-500">{log.visitor_name}</p>
                                                <span className="text-[9px] font-black opacity-40">{Number(log.confidence).toFixed(0)}% CONF.</span>
                                            </div>
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                                                Logged at {format(new Date(log.log_date), "HH:mm:ss")}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {/* Summary Stats */}
                        <div className="pt-6 border-t border-border/40">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-muted/30 p-4 rounded-2xl border border-border/30">
                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Detections</p>
                                    <p className="text-xl font-bold text-foreground">{detections.length}</p>
                                </div>
                                <div className="bg-muted/30 p-4 rounded-2xl border border-border/30">
                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Reference Set</p>
                                    <p className="text-xl font-bold text-primary">{faceMatcher ? faceMatcher.labeledDescriptors.length : 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* System Alerts */}
                    <div className="h-48 bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-sm flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                <Shield className="h-4 w-4 text-orange-600" />
                            </div>
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Alert Console</h3>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                            <AlertCircle className="h-5 w-5 text-orange-600 shrink-0" />
                            <p className="text-[10px] font-bold text-orange-800 dark:text-orange-300 uppercase tracking-widest leading-relaxed">
                                {!faceMatcher ? "Scanning visitors_img folder for reference data..." : "Intelligence engine active. Monitoring for unauthorized access."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Footer className="py-2 shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-t border-border/30" />

            <style jsx global>{`
                @keyframes scan {
                    0%, 100% { top: 0; }
                    50% { top: 100%; }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(var(--primary), 0.2);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(var(--primary), 0.4);
                }
            `}</style>
        </div>
    );
}
