import { cn } from "@/lib/utils";

interface RozAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isThinking?: boolean;
  isSpeaking?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-lg',
  md: 'w-10 h-10 text-xl',
  lg: 'w-14 h-14 text-2xl',
  xl: 'w-20 h-20 text-4xl'
};

export function RozAvatar({ size = 'md', isThinking = false, isSpeaking = false, className }: RozAvatarProps) {
  return (
    <div 
      className={cn(
        "relative rounded-full bg-gradient-to-br from-rose-400 via-pink-500 to-rose-600 flex items-center justify-center shadow-lg",
        sizeClasses[size],
        isThinking && "animate-pulse",
        className
      )}
    >
      {/* Rose emoji */}
      <span className={cn(
        "transition-transform duration-300",
        isSpeaking && "animate-bounce"
      )}>
        🌹
      </span>
      
      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="absolute -bottom-1 -right-1 flex gap-0.5">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
        </div>
      )}
      
      {/* Thinking ring */}
      {isThinking && (
        <div className="absolute inset-0 rounded-full border-2 border-rose-300 animate-spin" style={{ animationDuration: '2s' }} />
      )}
    </div>
  );
}
