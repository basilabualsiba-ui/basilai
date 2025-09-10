import { useFood } from '@/contexts/FoodContext';
import { ScheduleItem } from '@/contexts/ScheduleContext';
import { useState, useEffect } from 'react';

export const useFoodSchedule = () => {
  const { mealPlans, getMealPlanMeals } = useFood();
  const [mealScheduleItems, setMealScheduleItems] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    loadMealSchedule();
  }, [mealPlans]);

  const loadMealSchedule = async () => {
    try {
      // Get active meal plans
      const activePlans = mealPlans.filter(plan => plan.is_active);
      
      if (activePlans.length === 0) {
        setMealScheduleItems([]);
        return;
      }

      const allMealItems: ScheduleItem[] = [];

      for (const plan of activePlans) {
        const planMeals = await getMealPlanMeals(plan.id);
        
        const mealItems = planMeals.map(mealPlanMeal => {
          const mealTypeEmojis = {
            'breakfast': '🍳',
            'lunch': '🍽️',
            'dinner': '🍷',
            'snack': '🍎',
            'main': '🍽️'
          };

          const emoji = mealTypeEmojis[mealPlanMeal.meal?.meal_type?.toLowerCase() as keyof typeof mealTypeEmojis] || '🍽️';
          
          return {
            id: `meal-${mealPlanMeal.id}`,
            title: mealPlanMeal.meal?.name || 'Meal',
            description: mealPlanMeal.meal?.description || `${mealPlanMeal.meal?.total_calories || 0} cal`,
            type: 'meal' as const,
            startTime: mealPlanMeal.scheduled_time || mealPlanMeal.meal_time || mealPlanMeal.meal?.default_time,
            isCompleted: false, // Could be enhanced to check consumption records
            emoji: emoji,
            dayOfWeek: mealPlanMeal.day_of_week
          };
        }).filter(item => item.startTime); // Only include meals with scheduled times

        allMealItems.push(...mealItems);
      }

      setMealScheduleItems(allMealItems);
    } catch (error) {
      console.error('Error loading meal schedule:', error);
      setMealScheduleItems([]);
    }
  };

  const getFoodScheduleItems = (date?: string): ScheduleItem[] => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const targetDayOfWeek = new Date(targetDate).getDay() || 7; // Convert Sunday (0) to 7
    
    return mealScheduleItems.filter(item => item.dayOfWeek === targetDayOfWeek);
  };

  return {
    getFoodScheduleItems
  };
};