import { useState } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit, Trash2, Calendar, Clock, Target, CheckCircle } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';
import { EditWorkoutPlanDialog } from './edit-workout-plan-dialog';

export function WorkoutPlanManager() {
  const { workoutPlans, workoutSessions, deleteWorkoutPlan } = useGym();
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);

  // Check if a plan is completed (has at least one completed session)
  const isPlanCompleted = (planId: string) => {
    return workoutSessions.some(session => 
      session.plan_id === planId && session.completed_at
    );
  };

  // Check if a plan is active/ongoing
  const isPlanActive = (plan: any) => {
    const today = startOfDay(new Date());
    const startDate = startOfDay(new Date(plan.start_date));
    const endDate = plan.end_date ? startOfDay(new Date(plan.end_date)) : null;
    
    return plan.is_active && 
           (isBefore(startDate, today) || startDate.getTime() === today.getTime()) &&
           (!endDate || isAfter(endDate, today) || endDate.getTime() === today.getTime());
  };

  const handleDelete = async (planId: string) => {
    try {
      await deleteWorkoutPlan(planId);
      setShowDeleteDialog(null);
    } catch (error) {
      console.error('Error deleting workout plan:', error);
    }
  };

  const activePlans = workoutPlans.filter(plan => isPlanActive(plan));
  const completedPlans = workoutPlans.filter(plan => isPlanCompleted(plan.id));
  const editablePlans = workoutPlans.filter(plan => !isPlanCompleted(plan.id));

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Your Workout Plans</h3>
          <div className="flex gap-2 text-sm">
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Active ({activePlans.length})
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              Total ({workoutPlans.length})
            </Badge>
          </div>
        </div>

        {workoutPlans.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No workout plans yet</h3>
              <p className="text-muted-foreground">Create your first workout plan to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {workoutPlans.map((plan) => {
              const isCompleted = isPlanCompleted(plan.id);
              const isActive = isPlanActive(plan);
              const canEdit = !isCompleted;

              return (
                <Card key={plan.id} className={`transition-all duration-200 ${
                  isActive ? 'border-primary/50 bg-primary/5' : ''
                } ${isCompleted ? 'opacity-75' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">{plan.name}</CardTitle>
                          <div className="flex gap-1">
                            {isActive && (
                              <Badge variant="default" className="text-xs">
                                Active
                              </Badge>
                            )}
                            {isCompleted && (
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Completed
                              </Badge>
                            )}
                          </div>
                        </div>
                        {plan.description && (
                          <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(plan.start_date), 'MMM d')} - {plan.end_date ? format(new Date(plan.end_date), 'MMM d, yyyy') : 'Ongoing'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Created {format(new Date(plan.created_at), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPlan(plan)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDeleteDialog(plan.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editingPlan && (
        <EditWorkoutPlanDialog
          plan={editingPlan}
          open={!!editingPlan}
          onOpenChange={(open) => !open && setEditingPlan(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workout Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workout plan? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}
            >
              Delete Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}