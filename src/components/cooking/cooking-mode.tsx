import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Timer, Check, ChefHat, RotateCcw, X } from 'lucide-react';
import type { Recipe } from '@/pages/Cooking';

interface CookingModeProps {
  recipe: Recipe;
  onExit: () => void;
}

export const CookingMode = ({ recipe, onExit }: CookingModeProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const steps = recipe.steps.sort((a, b) => a.step_number - b.step_number);
  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Timer logic
  useEffect(() => {
    if (!isTimerRunning || timerSeconds === null || timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev === null || prev <= 1) {
          setIsTimerRunning(false);
          // Play alert sound
          try { new Audio('/sounds/timer-done.mp3').play(); } catch {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const startTimer = useCallback(() => {
    if (step?.timer_minutes) {
      setTimerSeconds(step.timer_minutes * 60);
      setIsTimerRunning(true);
    }
  }, [step]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const nextStep = () => {
    setTimerSeconds(null);
    setIsTimerRunning(false);
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsComplete(true);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setTimerSeconds(null);
      setIsTimerRunning(false);
      setCurrentStep(prev => prev - 1);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-sm border-border/30">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Meal Ready! ✅</h2>
            <p className="text-muted-foreground mb-6">{recipe.name} is ready to serve</p>
            <div className="space-y-3">
              <Button onClick={() => { setCurrentStep(0); setIsComplete(false); }} variant="outline" className="w-full rounded-xl">
                <RotateCcw className="h-4 w-4 mr-2" /> Cook Again
              </Button>
              <Button onClick={onExit} className="w-full rounded-xl">
                <X className="h-4 w-4 mr-2" /> Exit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!step) return null;

  const toolEmoji: Record<string, string> = {
    oven: '🔥', airfryer: '💨', stove: '🍳', pan: '🥘', pot: '🫕', mixer: '🔄', knife: '🔪', other: '🔧'
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/20">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="sm" onClick={onExit} className="rounded-xl">
            <X className="h-4 w-4 mr-1" /> Exit
          </Button>
          <span className="text-sm font-semibold text-foreground">{recipe.name}</span>
          <Badge variant="outline">Step {currentStep + 1}/{steps.length}</Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/30">
          <CardContent className="p-6 text-center space-y-4">
            {step.tool && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">{toolEmoji[step.tool] || '🔧'}</span>
                <Badge variant="secondary" className="capitalize">{step.tool}</Badge>
              </div>
            )}

            <p className="text-lg text-foreground leading-relaxed">{step.instruction}</p>

            {step.timer_minutes && (
              <div className="space-y-2">
                {timerSeconds !== null ? (
                  <div className="text-4xl font-mono font-bold text-primary">
                    {formatTime(timerSeconds)}
                  </div>
                ) : (
                  <Button onClick={startTimer} variant="outline" className="rounded-xl">
                    <Timer className="h-4 w-4 mr-2" /> Start Timer ({step.timer_minutes} min)
                  </Button>
                )}
                {isTimerRunning && (
                  <Button onClick={() => setIsTimerRunning(false)} variant="ghost" size="sm">Pause</Button>
                )}
                {timerSeconds !== null && !isTimerRunning && timerSeconds > 0 && (
                  <Button onClick={() => setIsTimerRunning(true)} variant="ghost" size="sm">Resume</Button>
                )}
                {timerSeconds === 0 && (
                  <p className="text-sm text-green-500 font-semibold">⏰ Timer done!</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="p-4 border-t border-border/20">
        <div className="flex items-center justify-between gap-4">
          <Button onClick={prevStep} disabled={currentStep === 0} variant="outline" className="rounded-xl flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" /> Previous
          </Button>
          <Button onClick={nextStep} className="rounded-xl flex-1">
            {currentStep === steps.length - 1 ? 'Finish' : 'Next'} <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};
