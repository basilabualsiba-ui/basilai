import React, { useState } from 'react';
import { useFood } from '@/contexts/FoodContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, Trash2, Calendar, Clock, Utensils, CheckCircle } from 'lucide-react';
import { format, isToday, isPast } from 'date-fns';
import { EditMealPlanDialog } from './edit-meal-plan-dialog';

export function MealPlanManager() {
  const { 
    mealPlans, 
    deleteMealPlan, 
    getMealPlanMeals, 
    getMealConsumptions,
    isMealConsumed 
  } = useFood();
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [mealConsumptions, setMealConsumptions] = useState<any[]>([]);
  const [planMealsMap, setPlanMealsMap] = useState<Record<string, any[]>>({});

  // Check if a meal plan is completed (all meals consumed)
  const isPlanCompleted = async (planId: string) => {
    try {
      if (!planMealsMap[planId]) {
        const meals = await getMealPlanMeals(planId);
        setPlanMealsMap(prev => ({ ...prev, [planId]: meals }));
        
        if (meals.length > 0) {
          const consumptions = await getMealConsumptions(meals.map(m => m.id));
          setMealConsumptions(consumptions);
        }
        
        return meals.length > 0 && meals.every(meal => 
          isMealConsumed(meal.id, mealConsumptions)
        );
      }
      
      const meals = planMealsMap[planId];
      return meals.length > 0 && meals.every(meal => 
        isMealConsumed(meal.id, mealConsumptions)
      );
    } catch (error) {
      console.error('Error checking plan completion:', error);
      return false;
    }
  };

  const handleDelete = async (planId: string) => {
    try {
      await deleteMealPlan(planId);
      setShowDeleteDialog(null);
      // Remove from local state
      setPlanMealsMap(prev => {
        const newMap = { ...prev };
        delete newMap[planId];
        return newMap;
      });
    } catch (error) {
      console.error('Error deleting meal plan:', error);
    }
  };

  const getPlanStatus = (plan: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for proper comparison
    const startDate = new Date(plan.start_date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = plan.end_date ? new Date(plan.end_date) : startDate;
    endDate.setHours(23, 59, 59, 999); // Set to end of day
    
    // If plan spans today
    if (startDate <= today && endDate >= today) return 'today';
    // If plan is completely in the past
    if (endDate < today) return 'past';
    // If plan starts in the future
    return 'future';
  };

  const todayPlans = mealPlans.filter(plan => getPlanStatus(plan) === 'today');
  const upcomingPlans = mealPlans.filter(plan => getPlanStatus(plan) === 'future');
  const pastPlans = mealPlans.filter(plan => getPlanStatus(plan) === 'past');

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Your Meal Plans</h3>
          <div className="flex gap-2 text-sm">
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Today ({todayPlans.length})
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              Total ({mealPlans.length})
            </Badge>
          </div>
        </div>

        {mealPlans.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Utensils className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No meal plans yet</h3>
              <p className="text-muted-foreground">Create your first meal plan to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Today's Plans */}
            {todayPlans.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Today's Plans
                </h4>
                <div className="grid gap-3">
                  {todayPlans.map((plan) => (
                    <PlanCard 
                      key={plan.id} 
                      plan={plan} 
                      onEdit={setEditingPlan}
                      onDelete={setShowDeleteDialog}
                      isPlanCompleted={isPlanCompleted}
                      status="today"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Plans */}
            {upcomingPlans.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Upcoming Plans
                </h4>
                <div className="grid gap-3">
                  {upcomingPlans.map((plan) => (
                    <PlanCard 
                      key={plan.id} 
                      plan={plan} 
                      onEdit={setEditingPlan}
                      onDelete={setShowDeleteDialog}
                      isPlanCompleted={isPlanCompleted}
                      status="future"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Past Plans */}
            {pastPlans.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  Past Plans
                </h4>
                <div className="grid gap-3">
                  {pastPlans.map((plan) => (
                    <PlanCard 
                      key={plan.id} 
                      plan={plan} 
                      onEdit={setEditingPlan}
                      onDelete={setShowDeleteDialog}
                      isPlanCompleted={isPlanCompleted}
                      status="past"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editingPlan && (
        <EditMealPlanDialog
          plan={editingPlan}
          open={!!editingPlan}
          onOpenChange={(open) => !open && setEditingPlan(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Meal Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this meal plan? This action cannot be undone.
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

interface PlanCardProps {
  plan: any;
  onEdit: (plan: any) => void;
  onDelete: (planId: string) => void;
  isPlanCompleted: (planId: string) => Promise<boolean>;
  status: 'today' | 'future' | 'past';
}

function PlanCard({ plan, onEdit, onDelete, isPlanCompleted, status }: PlanCardProps) {
  const [isCompleted, setIsCompleted] = useState(false);

  // Check completion status on mount
  React.useEffect(() => {
    const checkCompletion = async () => {
      const completed = await isPlanCompleted(plan.id);
      setIsCompleted(completed);
    };
    checkCompletion();
  }, [plan.id, isPlanCompleted]);

  // Only allow editing future plans or incomplete current plans
  const canEdit = status === 'future' || (status === 'today' && !isCompleted);
  const canDelete = status === 'future' || (status === 'today' && !isCompleted);

  return (
    <Card className={`transition-all duration-200 ${
      status === 'today' ? 'border-primary/50 bg-primary/5' : ''
    } ${isCompleted ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base">{plan.name}</CardTitle>
              <div className="flex gap-1">
                {status === 'today' && (
                  <Badge variant="default" className="text-xs">
                    Today
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
                {format(new Date(plan.start_date), 'MMM d, yyyy')}
                {plan.end_date && plan.end_date !== plan.start_date && (
                  <span> - {format(new Date(plan.end_date), 'MMM d, yyyy')}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Created {format(new Date(plan.created_at), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
          {(canEdit || canDelete) && (
            <div className="flex gap-1 ml-4">
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(plan)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(plan.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}