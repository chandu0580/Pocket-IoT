import React from "react";

interface SkeletonProps {
    width?: string;
    height?: string;
    className?: string;
}

export const LoadingSkeleton: React.FC<SkeletonProps> = ({ width = "100%", height = "20px", className = "" }) => {
    return (
        <div
            className={`bg-slate-800/50 rounded animate-pulse ${className}`}
            style={{ width, height }}
        />
    );
};

export const CardSkeleton: React.FC = () => {
    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
            <LoadingSkeleton width="40%" height="24px" />
            <LoadingSkeleton width="100%" height="16px" />
            <LoadingSkeleton width="80%" height="16px" />
            <LoadingSkeleton width="90%" height="16px" />
        </div>
    );
};

export const ChartSkeleton: React.FC = () => {
    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-64 flex flex-col justify-end gap-2">
            <div className="flex items-end gap-2 h-full justify-between opacity-30">
                <LoadingSkeleton width="8%" height="40%" />
                <LoadingSkeleton width="8%" height="70%" />
                <LoadingSkeleton width="8%" height="30%" />
                <LoadingSkeleton width="8%" height="90%" />
                <LoadingSkeleton width="8%" height="50%" />
                <LoadingSkeleton width="8%" height="10%" />
                <LoadingSkeleton width="8%" height="80%" />
                <LoadingSkeleton width="8%" height="60%" />
            </div>
        </div>
    );
};

export const EmptyState: React.FC<{ message: string; icon?: string }> = ({ message, icon = "📉" }) => {
    return (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/30 border border-slate-800/50 rounded-2xl text-center">
            <div className="text-4xl mb-4 opacity-70">{icon}</div>
            <p className="text-slate-400 font-medium">{message}</p>
        </div>
    );
};

export const ErrorState: React.FC<{ message?: string }> = ({ message = "Unable to load data. Please refresh." }) => {
    return (
        <div className="flex flex-col items-center justify-center p-12 bg-red-950/20 border border-red-900/30 rounded-2xl text-center">
            <div className="text-4xl mb-4 opacity-70">⚠️</div>
            <p className="text-red-400 font-medium">{message}</p>
        </div>
    );
};
