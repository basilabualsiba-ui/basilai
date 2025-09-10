import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FoodItem {
  id: string;
  name: string;
  description?: string;
  brand?: string;
  serving_size?: string;
  serving_unit?: string;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  fiber_per_serving: number;
  sugar_per_serving: number;
  sodium_per_serving: number;
  created_at: string;
  updated_at: string;
}

export interface Meal {
  id: string;
  name: string;
  description?: string;
  meal_type: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  default_time?: string;
  created_at: string;
  updated_at: string;
}

export interface MealFood {
  id: string;
  meal_id: string;
  food_item_id: string;
  quantity: number;
  unit: string;
  food_item?: FoodItem;
}

export interface MealPlan {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealPlanMeal {
  id: string;
  meal_plan_id: string;
  meal_id: string;
  scheduled_time?: string;
  meal_time?: string; // New field from database
  meal_order: number;
  day_of_week: number; // Add day_of_week field
  meal?: Meal;
}

export interface MealConsumption {
  id: string;
  meal_plan_meal_id: string;
  consumed_at: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface FoodContextType {
  // State
  foodItems: FoodItem[];
  meals: Meal[];
  mealPlans: MealPlan[];
  isLoading: boolean;
  
  // Food Items
  addFoodItem: (foodItem: Omit<FoodItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateFoodItem: (id: string, updates: Partial<FoodItem>) => Promise<void>;
  deleteFoodItem: (id: string) => Promise<void>;
  
  // Meals
  addMeal: (meal: Omit<Meal, 'id' | 'created_at' | 'updated_at'>) => Promise<Meal>;
  updateMeal: (id: string, updates: Partial<Meal>) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  getMealFoods: (mealId: string) => Promise<MealFood[]>;
  addFoodToMeal: (mealId: string, foodItemId: string, quantity: number, unit: string) => Promise<void>;
  removeFoodFromMeal: (mealFoodId: string) => Promise<void>;
  
  // Meal Plans
  addMealPlan: (plan: Omit<MealPlan, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateMealPlan: (id: string, updates: Partial<MealPlan>) => Promise<void>;
  deleteMealPlan: (id: string) => Promise<void>;
  getMealPlanMeals: (planId: string) => Promise<MealPlanMeal[]>;
  addMealToPlan: (planId: string, mealId: string, mealTime?: string, mealOrder?: number) => Promise<void>;
  removeMealFromPlan: (mealPlanMealId: string) => Promise<void>;
  
  // Meal Consumption
  getMealConsumptions: (mealPlanMealIds: string[]) => Promise<MealConsumption[]>;
  markMealAsConsumed: (mealPlanMealId: string, notes?: string) => Promise<void>;
  unmarkMealAsConsumed: (mealPlanMealId: string) => Promise<void>;
  isMealConsumed: (mealPlanMealId: string, consumptions: MealConsumption[]) => boolean;
  
  // Nutrition calculation
  recalculateMealNutrition: (mealId: string) => Promise<void>;
  
  // Refresh data
  refreshData: () => Promise<void>;
}

const FoodContext = createContext<FoodContextType | undefined>(undefined);

export const FoodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log('Loading food data...');
      
      // Load food items
      const { data: foodData, error: foodError } = await supabase
        .from('food_items')
        .select('*')
        .order('name');
      
      console.log('Food items response:', { foodData, foodError });
      if (foodError) throw foodError;
      setFoodItems(foodData || []);

      // Load meals
      const { data: mealData, error: mealError } = await supabase
        .from('meals')
        .select('*')
        .order('name');
      
      console.log('Meals response:', { mealData, mealError });
      if (mealError) throw mealError;
      setMeals(mealData || []);

      // Load meal plans
      const { data: planData, error: planError } = await supabase
        .from('meal_plans')
        .select('*')
        .order('start_date', { ascending: false });
      
      console.log('Meal plans response:', { planData, planError });
      if (planError) throw planError;
      setMealPlans(planData || []);

      console.log('Food data loaded successfully');
      
      // Recalculate nutrition for all meals to ensure they're up to date
      if (mealData && mealData.length > 0) {
        console.log('Recalculating nutrition for all meals...');
        for (const meal of mealData) {
          try {
            console.log(`Recalculating nutrition for meal: ${meal.name}`);
            await recalculateMealNutrition(meal.id);
          } catch (error) {
            console.error(`Error recalculating nutrition for meal ${meal.id} (${meal.name}):`, error);
          }
        }
        console.log('Nutrition recalculation completed');
        
        // Reload meals to get updated nutrition values
        const { data: updatedMealData } = await supabase
          .from('meals')
          .select('*')
          .order('name');
        if (updatedMealData) {
          setMeals(updatedMealData);
          console.log('Updated meal data loaded');
        }
      }
    } catch (error) {
      console.error('Error loading food data:', error);
      // Set empty arrays on error to prevent loading indefinitely
      setFoodItems([]);
      setMeals([]);
      setMealPlans([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Food Items
  const addFoodItem = async (foodItem: Omit<FoodItem, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('food_items')
      .insert([foodItem])
      .select()
      .single();
    
    if (error) throw error;
    setFoodItems(prev => [...prev, data]);
  };

  const updateFoodItem = async (id: string, updates: Partial<FoodItem>) => {
    const { data, error } = await supabase
      .from('food_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    setFoodItems(prev => prev.map(item => item.id === id ? data : item));
  };

  const deleteFoodItem = async (id: string) => {
    const { error } = await supabase
      .from('food_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    setFoodItems(prev => prev.filter(item => item.id !== id));
  };

  // Meals
  const addMeal = async (meal: Omit<Meal, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('meals')
      .insert([meal])
      .select()
      .single();
    
    if (error) throw error;
    setMeals(prev => [...prev, data]);
    return data; // Return the created meal
  };

  const updateMeal = async (id: string, updates: Partial<Meal>) => {
    const { data, error } = await supabase
      .from('meals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    setMeals(prev => prev.map(meal => meal.id === id ? data : meal));
  };

  const deleteMeal = async (id: string) => {
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    setMeals(prev => prev.filter(meal => meal.id !== id));
  };

  const recalculateMealNutrition = async (mealId: string) => {
    // Get all foods in the meal
    const mealFoods = await getMealFoods(mealId);
    
    // Calculate totals
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
    mealFoods.forEach(mealFood => {
      if (mealFood.food_item) {
        let multiplier = mealFood.quantity;
        
        // If the unit is not 'serving', calculate the multiplier based on serving size
        if (mealFood.unit !== 'serving' && mealFood.food_item.serving_size && mealFood.food_item.serving_unit === mealFood.unit) {
          multiplier = mealFood.quantity / parseFloat(mealFood.food_item.serving_size);
        }
        
        totalCalories += (mealFood.food_item.calories_per_serving || 0) * multiplier;
        totalProtein += (mealFood.food_item.protein_per_serving || 0) * multiplier;
        totalCarbs += (mealFood.food_item.carbs_per_serving || 0) * multiplier;
        totalFat += (mealFood.food_item.fat_per_serving || 0) * multiplier;
      }
    });
    
    // Update the meal with calculated totals
    const { error } = await supabase
      .from('meals')
      .update({
        total_calories: Math.round(totalCalories * 100) / 100, // Round to 2 decimal places
        total_protein: Math.round(totalProtein * 100) / 100,
        total_carbs: Math.round(totalCarbs * 100) / 100,
        total_fat: Math.round(totalFat * 100) / 100
      })
      .eq('id', mealId);
    
    if (error) throw error;
    
    // Update local state
    setMeals(prev => prev.map(meal => 
      meal.id === mealId 
        ? { 
            ...meal, 
            total_calories: Math.round(totalCalories * 100) / 100, 
            total_protein: Math.round(totalProtein * 100) / 100, 
            total_carbs: Math.round(totalCarbs * 100) / 100, 
            total_fat: Math.round(totalFat * 100) / 100 
          }
        : meal
    ));
  };

  const getMealFoods = async (mealId: string): Promise<MealFood[]> => {
    console.log('Fetching meal foods for meal ID:', mealId);
    const { data, error } = await supabase
      .from('meal_foods')
      .select(`
        *,
        food_items!inner(*)
      `)
      .eq('meal_id', mealId);
    
    console.log('Raw meal foods data:', data);
    if (error) {
      console.error('Error fetching meal foods:', error);
      throw error;
    }
    
    const result = (data || []).map(item => ({
      ...item,
      food_item: item.food_items as any
    }));
    console.log('Processed meal foods:', result);
    return result;
  };

  const addFoodToMeal = async (mealId: string, foodItemId: string, quantity: number, unit: string) => {
    const { error } = await supabase
      .from('meal_foods')
      .insert([{
        meal_id: mealId,
        food_item_id: foodItemId,
        quantity,
        unit
      }]);
    
    if (error) throw error;
    
    // Recalculate meal nutrition totals
    await recalculateMealNutrition(mealId);
  };

  const removeFoodFromMeal = async (mealFoodId: string) => {
    // Get the meal_id before deleting
    const { data: mealFood } = await supabase
      .from('meal_foods')
      .select('meal_id')
      .eq('id', mealFoodId)
      .single();
    
    const { error } = await supabase
      .from('meal_foods')
      .delete()
      .eq('id', mealFoodId);
    
    if (error) throw error;
    
    // Recalculate meal nutrition totals if we found the meal
    if (mealFood?.meal_id) {
      await recalculateMealNutrition(mealFood.meal_id);
    }
  };

  // Meal Plans
  const addMealPlan = async (plan: any) => {
    const { data, error } = await supabase
      .from('meal_plans')
      .insert([plan])
      .select()
      .single();
    
    if (error) throw error;
    setMealPlans(prev => [...prev, data]);
  };

  const updateMealPlan = async (id: string, updates: Partial<MealPlan>) => {
    const { data, error } = await supabase
      .from('meal_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    setMealPlans(prev => prev.map(plan => plan.id === id ? data : plan));
  };

  const deleteMealPlan = async (id: string) => {
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    setMealPlans(prev => prev.filter(plan => plan.id !== id));
  };

  const getMealPlanMeals = async (planId: string): Promise<MealPlanMeal[]> => {
    console.log('Getting meal plan meals for plan ID:', planId);
    const { data, error } = await supabase
      .from('meal_plan_meals')
      .select(`
        *,
        meals!inner(*)
      `)
      .eq('meal_plan_id', planId)
      .order('meal_order')
      .order('meal_time');
    
    console.log('Raw meal plan meals data:', data);
    console.log('Error (if any):', error);
    
    if (error) throw error;
    const result = (data || []).map(item => ({
      ...item,
      meal: item.meals as any
    }));
    console.log('Processed meal plan meals:', result);
    return result;
  };

  const addMealToPlan = async (planId: string, mealId: string, mealTime?: string, mealOrder = 1) => {
    const meal = meals.find(m => m.id === mealId);
    
    const { error } = await supabase
      .from('meal_plan_meals')
      .insert([{
        meal_plan_id: planId,
        meal_id: mealId,
        meal_time: mealTime || meal?.default_time,
        meal_order: mealOrder
      }]);
    
    if (error) throw error;
  };

  const removeMealFromPlan = async (mealPlanMealId: string) => {
    const { error } = await supabase
      .from('meal_plan_meals')
      .delete()
      .eq('id', mealPlanMealId);
    
    if (error) throw error;
  };

  // Meal Consumption
  const getMealConsumptions = async (mealPlanMealIds: string[]): Promise<MealConsumption[]> => {
    if (mealPlanMealIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('meal_consumptions')
      .select('*')
      .in('meal_plan_meal_id', mealPlanMealIds);
    
    if (error) throw error;
    return data || [];
  };

  const markMealAsConsumed = async (mealPlanMealId: string, notes?: string) => {
    const { error } = await supabase
      .from('meal_consumptions')
      .insert([{
        meal_plan_meal_id: mealPlanMealId,
        notes
      }]);
    
    if (error) throw error;
  };

  const unmarkMealAsConsumed = async (mealPlanMealId: string) => {
    const { error } = await supabase
      .from('meal_consumptions')
      .delete()
      .eq('meal_plan_meal_id', mealPlanMealId);
    
    if (error) throw error;
  };

  const isMealConsumed = (mealPlanMealId: string, consumptions: MealConsumption[]): boolean => {
    return consumptions.some(consumption => consumption.meal_plan_meal_id === mealPlanMealId);
  };

  const refreshData = () => loadData();

  const value: FoodContextType = {
    // State
    foodItems,
    meals,
    mealPlans,
    isLoading,
    
    // Food Items
    addFoodItem,
    updateFoodItem,
    deleteFoodItem,
    
    // Meals
    addMeal,
    updateMeal,
    deleteMeal,
    getMealFoods,
    addFoodToMeal,
    removeFoodFromMeal,
    
    // Meal Plans
    addMealPlan,
    updateMealPlan,
    deleteMealPlan,
    getMealPlanMeals,
    addMealToPlan,
    removeMealFromPlan,
    
    // Meal Consumption
    getMealConsumptions,
    markMealAsConsumed,
    unmarkMealAsConsumed,
    isMealConsumed,
    
    // Nutrition calculation
    recalculateMealNutrition,
    
    // Refresh data
    refreshData,
  };

  return (
    <FoodContext.Provider value={value}>
      {children}
    </FoodContext.Provider>
  );
};

export const useFood = () => {
  const context = useContext(FoodContext);
  if (context === undefined) {
    throw new Error('useFood must be used within a FoodProvider');
  }
  return context;
};