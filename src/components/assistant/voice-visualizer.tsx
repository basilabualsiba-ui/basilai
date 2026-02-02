import { cn } from "@/lib/utils";

interface VoiceVisualizerProps {
  isActive: boolean;
  className?: string;
}

export function VoiceVisualizer({ isActive, className }: VoiceVisualizerProps) {
  if (!isActive) return null;

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 bg-rose-500 rounded-full transition-all",
            isActive && "animate-pulse"
          )}
          style={{
            height: `${Math.random() * 16 + 8}px`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.5s'
          }}
        />
      ))}
    </div>
  );
}

interface VoiceWaveProps {
  isListening: boolean;
  className?: string;
}

export function VoiceWave({ isListening, className }: VoiceWaveProps) {
  return (
    <div className={cn("flex items-end justify-center gap-0.5 h-6", className)}>
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full transition-all duration-150",
            isListening 
              ? "bg-rose-500" 
              : "bg-muted-foreground/30"
          )}
          style={{
            height: isListening 
              ? `${Math.sin((Date.now() / 200) + i) * 8 + 12}px` 
              : '4px',
            animation: isListening 
              ? `wave 0.5s ease-in-out infinite` 
              : 'none',
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
