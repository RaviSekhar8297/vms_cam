export default function Footer({ className = "" }: { className?: string }) {
    return (
        <div className={`py-3 text-center text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-widest ${className}`}>
            Powered by <span className="font-bold text-foreground">Brihaspathi Technologies Limited<sup>®</sup></span>
        </div>
    );
}
