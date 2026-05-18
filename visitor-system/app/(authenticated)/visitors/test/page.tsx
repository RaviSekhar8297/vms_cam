"use client";

import { useEffect, useState } from "react";

export default function TestPage() {
    const [status, setStatus] = useState("Wait...");

    useEffect(() => {
        console.log("TEST PAGE HYDRATED");
        setStatus("JS IS WORKING!");
    }, []);

    return (
        <div style={{ padding: '50px', textAlign: 'center' }}>
            <h1 style={{ color: status === "JS IS WORKING!" ? "green" : "red" }}>
                {status}
            </h1>
            <button
                onClick={() => alert("Button Clicked!")}
                style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
                CLICK ME TO TEST JS
            </button>
            <p>If the text above is RED, JavaScript is NOT running.</p>
            <p>If the text above is GREEN, JavaScript IS working.</p>
        </div>
    );
}
