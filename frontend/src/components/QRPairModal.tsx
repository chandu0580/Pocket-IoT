import React, { useEffect, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createPairToken, PairTokenResponse } from "../api";

interface Props {
    onClose: () => void;
    onDevicePaired?: () => void;
}

const QRPairModal: React.FC<Props> = ({ onClose, onDevicePaired }) => {
    const [state, setState] = useState<"loading" | "ready" | "error">("loading");
    const [pairData, setPairData] = useState<PairTokenResponse | null>(null);
    const [error, setError] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(300);
    const [copied, setCopied] = useState(false);

    const fetchToken = useCallback(async () => {
        setState("loading");
        setError("");
        try {
            const data = await createPairToken();
            setPairData(data);
            setSecondsLeft(data.expires_in ?? 300);
            setState("ready");
        } catch (e: any) {
            setError(e.message ?? "Failed to generate QR code");
            setState("error");
        }
    }, []);

    useEffect(() => {
        fetchToken();
    }, [fetchToken]);

    // Countdown timer
    useEffect(() => {
        if (state !== "ready") return;
        const id = setInterval(() => {
            setSecondsLeft((s) => {
                if (s <= 1) {
                    clearInterval(id);
                    setState("error");
                    setError("QR code expired. Generate a new one.");
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [state]);

    // Listen for SSE device_registered to auto-close with success
    useEffect(() => {
        if (!pairData) return;
        const handler = () => {
            onDevicePaired?.();
            onClose();
        };
        window.addEventListener("pocketiot:device_registered", handler);
        return () => window.removeEventListener("pocketiot:device_registered", handler);
    }, [pairData, onClose, onDevicePaired]);

    const handleCopy = () => {
        if (!pairData) return;
        navigator.clipboard.writeText(pairData.pair_url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const expProgress = pairData ? (secondsLeft / (pairData.expires_in ?? 300)) * 100 : 100;
    const isUrgent = secondsLeft < 60;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="relative w-full max-w-sm rounded-3xl overflow-hidden"
                style={{
                    background: "linear-gradient(145deg, #1e1b4b 0%, #0f172a 60%, #042f2e 100%)",
                    border: "1px solid rgba(99,102,241,0.3)",
                    boxShadow: "0 0 80px rgba(99,102,241,0.25), 0 32px 64px rgba(0,0,0,0.6)",
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                            style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}
                        >
                            📱
                        </div>
                        <div>
                            <div className="text-sm font-black text-white">Add Device</div>
                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">QR Pairing</div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all text-lg"
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {state === "loading" && (
                        <div className="flex flex-col items-center gap-3 py-8">
                            <div
                                className="w-12 h-12 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin"
                            />
                            <p className="text-slate-400 text-sm">Generating secure pairing code…</p>
                        </div>
                    )}

                    {state === "error" && (
                        <div className="flex flex-col items-center gap-4 py-6">
                            <div className="text-4xl">⚠️</div>
                            <p className="text-red-400 text-sm text-center">{error}</p>
                            <button
                                onClick={fetchToken}
                                className="px-6 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                                style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}
                            >
                                🔄 Generate New Code
                            </button>
                        </div>
                    )}

                    {state === "ready" && pairData && (
                        <>
                            {/* QR Code */}
                            <div className="flex justify-center">
                                <div
                                    className="p-4 rounded-2xl"
                                    style={{ background: "white", boxShadow: "0 0 40px rgba(99,102,241,0.35)" }}
                                >
                                    <QRCodeSVG
                                        value={pairData.pair_url}
                                        size={180}
                                        level="M"
                                        includeMargin={false}
                                        fgColor="#0f172a"
                                        bgColor="#ffffff"
                                    />
                                </div>
                            </div>

                            {/* Expiry countdown bar */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                        Expires in
                                    </span>
                                    <span
                                        className={`text-sm font-black tabular-nums ${isUrgent ? "text-red-400 animate-pulse" : "text-emerald-400"}`}
                                    >
                                        {mins}:{secs.toString().padStart(2, "0")}
                                    </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000"
                                        style={{
                                            width: `${expProgress}%`,
                                            background: isUrgent
                                                ? "linear-gradient(90deg, #ef4444, #f87171)"
                                                : "linear-gradient(90deg, #6366f1, #22d3ee)",
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Instructions */}
                            <div
                                className="rounded-xl p-3 space-y-1.5"
                                style={{
                                    background: "rgba(99,102,241,0.08)",
                                    border: "1px solid rgba(99,102,241,0.2)",
                                }}
                            >
                                <p className="text-[11px] font-black text-indigo-300 uppercase tracking-widest">
                                    How to connect
                                </p>
                                {[
                                    "Open camera app on your phone",
                                    "Scan the QR code above",
                                    "Device registers & streams automatically",
                                ].map((step, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <span
                                            className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center flex-shrink-0 mt-px"
                                            style={{ background: "rgba(99,102,241,0.3)", color: "#a5b4fc" }}
                                        >
                                            {i + 1}
                                        </span>
                                        <span className="text-[11px] text-slate-300">{step}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Copy URL */}
                            <button
                                onClick={handleCopy}
                                className="w-full py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                                style={{
                                    background: copied ? "rgba(34,197,94,0.15)" : "rgba(99,102,241,0.15)",
                                    border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(99,102,241,0.3)"}`,
                                    color: copied ? "#86efac" : "#a5b4fc",
                                }}
                            >
                                {copied ? "✅ Copied!" : "🔗 Copy Pairing Link"}
                            </button>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-5">
                    <p className="text-[10px] text-slate-600 text-center">
                        Token is one-time use · valid for 5 minutes · auto-refreshes on scan
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QRPairModal;
