import { useDreams } from "@/contexts/DreamsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

export const GoalsOverview = () => {
  const { dreams } = useDreams();
  const [goalsWithMetadata, setGoalsWithMetadata] = useState<any[]>([]);

  useEffect(() => {
    const dreamsWithBudget = dreams.filter(d => 
      d.estimated_cost && d.status === 'in_progress'
    );

    const enrichedGoals = dreamsWithBudget.map(dream => {
      const stored = localStorage.getItem(`dream_${dream.id}_meta`);
      const metadata = stored ? JSON.parse(stored) : null;
      return { ...dream, metadata };
    });

    setGoalsWithMetadata(enrichedGoals);
  }, [dreams]);

  const totalGoalAmount = goalsWithMetadata.reduce((sum, g) => 
    sum + Number(g.estimated_cost || 0), 0
  );
  
  const totalSaved = goalsWithMetadata.reduce((sum, g) => 
    sum + (g.metadata?.current || 0), 0
  );

  const overallProgress = totalGoalAmount > 0 
    ? Math.round((totalSaved / totalGoalAmount) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Goal Amount</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalGoalAmount.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              Across {goalsWithMetadata.length} active {goalsWithMetadata.length === 1 ? 'goal' : 'goals'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saved</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${totalSaved.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              {overallProgress}% of total goals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalGoalAmount - totalSaved).toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              To reach all goals
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Active Financial Goals</h3>
        {goalsWithMetadata.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No active financial goals. Add dreams with estimated costs to track your savings progress!
              </p>
            </CardContent>
          </Card>
        ) : (
          goalsWithMetadata.map((goal) => (
            <Card key={goal.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{goal.title}</CardTitle>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground">{goal.description}</p>
                    )}
                  </div>
                  <Badge variant="outline">{goal.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {goal.metadata ? (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Saved</p>
                        <p className="font-semibold text-primary">
                          ${goal.metadata.current.toFixed(0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Goal</p>
                        <p className="font-semibold">
                          ${goal.metadata.target.toFixed(0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Remaining</p>
                        <p className="font-semibold">
                          ${goal.metadata.remaining.toFixed(0)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{goal.progress_percentage}%</span>
                      </div>
                      <Progress value={goal.progress_percentage} />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Target</span>
                      <span className="font-medium">${Number(goal.estimated_cost).toFixed(0)}</span>
                    </div>
                    <Progress value={goal.progress_percentage} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
