import { LucideIcon } from "lucide-react";

interface ModuleIntroScreenProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  theme: "wallet" | "gym" | "dreams" | "supplements" | "weight" | "agenda" | "tv" | "games";
}

const themeClasses: Record<ModuleIntroScreenProps["theme"], { shell: string; glow: string }> = {
  wallet: {
    shell: "from-wallet via-wallet to-emerald-500 shadow-wallet/40",
    glow: "from-wallet/50 to-emerald-500/30",
  },
  gym: {
    shell: "from-gym via-gym to-red-500 shadow-gym/40",
    glow: "from-gym/50 to-red-500/30",
  },
  dreams: {
    shell: "from-dreams via-dreams to-pink-500 shadow-dreams/40",
    glow: "from-dreams/50 to-pink-500/30",
  },
  supplements: {
    shell: "from-supplements via-supplements to-violet-500 shadow-supplements/40",
    glow: "from-supplements/50 to-violet-500/30",
  },
  weight: {
    shell: "from-weight via-weight to-cyan-500 shadow-weight/40",
    glow: "from-weight/50 to-cyan-500/30",
  },
  agenda: {
    shell: "from-agenda via-agenda to-yellow-500 shadow-agenda/40",
    glow: "from-agenda/50 to-yellow-500/30",
  },
  tv: {
    shell: "from-cyan-500 via-cyan-500 to-blue-600 shadow-cyan-500/40",
    glow: "from-cyan-500/50 to-blue-500/30",
  },
  games: {
    shell: "from-primary via-primary to-accent shadow-primary/40",
    glow: "from-primary/50 to-accent/30",
  },
};

export function ModuleIntroScreen({ icon: Icon, title, subtitle, theme }: ModuleIntroScreenProps) {
  const classes = themeClasses[theme];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-card/20 px-6">
      <div className="text-center space-y-5 animate-enter">
        <div className="relative mx-auto w-fit">
          <div className={`p-6 rounded-[2rem] bg-gradient-to-br ${classes.shell} shadow-2xl animate-pulse-soft`}>
            <Icon className="h-12 w-12 text-white animate-float" />
          </div>
          <div className={`absolute inset-0 rounded-[2rem] bg-gradient-to-br ${classes.glow} blur-3xl -z-10 animate-pulse-soft`} />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
