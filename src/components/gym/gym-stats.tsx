import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Weight, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Calendar, 
  Target,
  Activity,
  Ruler,
  Edit,
  Trash2
} from 'lucide-react';
import { useGym } from '@/contexts/GymContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BodyStat {
  id: string;
  weight: number;
  height?: number;
  recorded_at: string;
  notes?: string;
}

export function GymStats() {
  const [bodyStats, setBodyStats] = useState<BodyStat[]>([]);
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [showEditWeight, setShowEditWeight] = useState(false);
  const [editingStat, setEditingStat] = useState<BodyStat | null>(null);
  const [newWeight, setNewWeight] = useState('');
  const [newHeight, setNewHeight] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const { workoutSessions, exercises } = useGym();

  useEffect(() => {
    fetchBodyStats();
  }, []);

  const fetchBodyStats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_body_stats')
        .select('*')
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      setBodyStats(data || []);
    } catch (error) {
      console.error('Error fetching body stats:', error);
      toast.error('Failed to load body stats');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWeight = async () => {
    if (!newWeight.trim()) {
      toast.error('Please enter your weight');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_body_stats')
        .insert({
          weight: parseFloat(newWeight),
          height: newHeight ? parseFloat(newHeight) : null,
          notes: notes.trim() || null
        });

      if (error) throw error;

      toast.success('Weight recorded successfully!');
      setNewWeight('');
      setNewHeight('');
      setNotes('');
      setShowAddWeight(false);
      fetchBodyStats();
    } catch (error) {
      console.error('Error adding weight:', error);
      toast.error('Failed to record weight');
    }
  };

  const handleEditWeight = async () => {
    if (!newWeight.trim() || !editingStat) {
      toast.error('Please enter your weight');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_body_stats')
        .update({
          weight: parseFloat(newWeight),
          height: newHeight ? parseFloat(newHeight) : null,
          notes: notes.trim() || null
        })
        .eq('id', editingStat.id);

      if (error) throw error;

      toast.success('Weight updated successfully!');
      setNewWeight('');
      setNewHeight('');
      setNotes('');
      setEditingStat(null);
      setShowEditWeight(false);
      fetchBodyStats();
    } catch (error) {
      console.error('Error updating weight:', error);
      toast.error('Failed to update weight');
    }
  };

  const handleDeleteWeight = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_body_stats')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Weight entry deleted successfully!');
      fetchBodyStats();
    } catch (error) {
      console.error('Error deleting weight:', error);
      toast.error('Failed to delete weight entry');
    }
  };

  const startEdit = (stat: BodyStat) => {
    setEditingStat(stat);
    setNewWeight(stat.weight.toString());
    setNewHeight(stat.height?.toString() || '');
    setNotes(stat.notes || '');
    setShowEditWeight(true);
  };

  // Calculate stats
  const currentWeight = bodyStats[0]?.weight || 0;
  const previousWeight = bodyStats[1]?.weight || currentWeight;
  const weightChange = currentWeight - previousWeight;
  const currentHeight = bodyStats.find(stat => stat.height)?.height;
  
  // BMI calculations
  const heightInMeters = currentHeight ? currentHeight / 100 : 0;
  const bmi = currentWeight && heightInMeters ? currentWeight / (heightInMeters * heightInMeters) : 0;
  
  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-500' };
    if (bmi < 25) return { category: 'Normal weight', color: 'text-green-500' };
    if (bmi < 30) return { category: 'Overweight', color: 'text-yellow-500' };
    return { category: 'Obese', color: 'text-red-500' };
  };
  
  const getIdealWeightRange = (heightInMeters: number) => {
    if (!heightInMeters) return null;
    // Normal BMI range: 18.5-24.9
    const normalMinWeight = 18.5 * heightInMeters * heightInMeters;
    const normalMaxWeight = 24.9 * heightInMeters * heightInMeters;
    
    // Muscular BMI range: 25-27 (higher due to muscle mass)
    const muscularMinWeight = 25 * heightInMeters * heightInMeters;
    const muscularMaxWeight = 27 * heightInMeters * heightInMeters;
    
    return { 
      normal: { min: normalMinWeight, max: normalMaxWeight },
      muscular: { min: muscularMinWeight, max: muscularMaxWeight }
    };
  };
  
  const bmiCategory = getBMICategory(bmi);
  const idealWeightRange = getIdealWeightRange(heightInMeters);
  
  // Calculate weight needed to reach muscular ideal
  const weightToGain = idealWeightRange?.muscular 
    ? Math.max(0, idealWeightRange.muscular.min - currentWeight)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading your stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gym Statistics</h1>
          <p className="text-muted-foreground">Track your progress and achievements</p>
        </div>
        <Dialog open={showAddWeight} onOpenChange={setShowAddWeight}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Weight
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Body Stats</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  placeholder="70.5"
                />
              </div>
              <div>
                <Label htmlFor="height">Height (cm) - Optional</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  value={newHeight}
                  onChange={(e) => setNewHeight(e.target.value)}
                  placeholder="175.0"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes - Optional</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How you're feeling, goals, etc."
                />
              </div>
              <Button onClick={handleAddWeight} className="w-full">
                Record Stats
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Weight Dialog */}
      <Dialog open={showEditWeight} onOpenChange={setShowEditWeight}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Body Stats</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-weight">Weight (kg)</Label>
              <Input
                id="edit-weight"
                type="number"
                step="0.1"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="70.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-height">Height (cm) - Optional</Label>
              <Input
                id="edit-height"
                type="number"
                step="0.1"
                value={newHeight}
                onChange={(e) => setNewHeight(e.target.value)}
                placeholder="175.0"
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes - Optional</Label>
              <Input
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How you're feeling, goals, etc."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleEditWeight} className="flex-1">
                Update Stats
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowEditWeight(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Weight className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Weight</p>
                <p className="text-2xl font-bold text-foreground">{currentWeight}kg</p>
                {weightChange !== 0 && (
                  <div className={`flex items-center text-sm ${weightChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {weightChange > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(weightChange).toFixed(1)}kg
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Ruler className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Height</p>
                <p className="text-2xl font-bold text-foreground">
                  {currentHeight ? `${currentHeight}cm` : 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">BMI</p>
                <p className="text-2xl font-bold text-foreground">
                  {bmi > 0 ? bmi.toFixed(1) : 'N/A'}
                </p>
                {bmi > 0 && (
                  <p className={`text-xs font-medium ${bmiCategory.color}`}>
                    {bmiCategory.category}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Muscular Target</p>
                <p className="text-2xl font-bold text-foreground">
                  {idealWeightRange?.muscular 
                    ? `${idealWeightRange.muscular.min.toFixed(0)}-${idealWeightRange.muscular.max.toFixed(0)}kg`
                    : 'Set height'
                  }
                </p>
                <p className="text-xs text-muted-foreground">With muscle mass</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Weight to Gain</p>
                <p className="text-2xl font-bold text-foreground">
                  {weightToGain > 0 ? `+${weightToGain.toFixed(1)}kg` : 'Target reached!'}
                </p>
                <p className="text-xs text-muted-foreground">For muscle goal</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BMI Information Card */}
      {bmi > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>BMI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-foreground mb-4">Your BMI Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current BMI:</span>
                    <span className="font-medium text-foreground">{bmi.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span className={`font-medium ${bmiCategory.color}`}>{bmiCategory.category}</span>
                  </div>
                  {idealWeightRange && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Normal range:</span>
                        <span className="font-medium text-foreground">
                          {idealWeightRange.normal.min.toFixed(0)}-{idealWeightRange.normal.max.toFixed(0)}kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Muscular target:</span>
                        <span className="font-medium text-primary">
                          {idealWeightRange.muscular.min.toFixed(0)}-{idealWeightRange.muscular.max.toFixed(0)}kg
                        </span>
                      </div>
                      {weightToGain > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Weight to gain:</span>
                          <span className="font-medium text-green-500">
                            +{weightToGain.toFixed(1)}kg
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-4">Weight Targets</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-500">Underweight:</span>
                    <span className="text-muted-foreground">Below 18.5 BMI</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-500">Normal weight:</span>
                    <span className="text-muted-foreground">18.5 - 24.9 BMI</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary">Muscular target:</span>
                    <span className="text-muted-foreground">25.0 - 27.0 BMI</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-500">Overweight:</span>
                    <span className="text-muted-foreground">Above 27.0 BMI</span>
                  </div>
                  {weightToGain > 0 && (
                    <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                      <p className="text-sm font-medium text-primary">
                        لتصل للوزن المثالي مع العضل، تحتاج زيادة {weightToGain.toFixed(1)} كيلو
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weight Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Weight History</CardTitle>
        </CardHeader>
        <CardContent>
          {bodyStats.length === 0 ? (
            <div className="text-center py-8">
              <Weight className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground mb-2">No weight records yet</p>
              <p className="text-muted-foreground mb-4">Start tracking your weight to see progress over time</p>
              <Button onClick={() => setShowAddWeight(true)}>
                Add Your First Weight Entry
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {bodyStats.map((stat, index) => (
                 <div key={stat.id} className="flex items-center justify-between p-4 border rounded-lg">
                   <div className="flex items-center space-x-4">
                     <div className="p-2 bg-primary/10 rounded-full">
                       <Weight className="h-4 w-4 text-primary" />
                     </div>
                     <div>
                       <p className="font-medium text-foreground">{stat.weight}kg</p>
                       {stat.height && (
                         <p className="text-sm text-muted-foreground">Height: {stat.height}cm</p>
                       )}
                       {stat.notes && (
                         <p className="text-sm text-muted-foreground italic">{stat.notes}</p>
                       )}
                     </div>
                   </div>
                   <div className="flex items-center gap-4">
                     <div className="text-right">
                       <p className="text-sm text-muted-foreground">
                         {new Date(stat.recorded_at).toLocaleDateString()}
                       </p>
                       <p className="text-xs text-muted-foreground">
                         {new Date(stat.recorded_at).toLocaleTimeString()}
                       </p>
                       {index > 0 && (
                         <div className={`text-xs ${
                           stat.weight > bodyStats[index - 1].weight ? 'text-red-500' : 'text-green-500'
                         }`}>
                           {stat.weight > bodyStats[index - 1].weight ? '+' : ''}
                           {(stat.weight - bodyStats[index - 1].weight).toFixed(1)}kg
                         </div>
                       )}
                     </div>
                     <div className="flex items-center gap-2">
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => startEdit(stat)}
                         className="h-8 w-8 p-0"
                       >
                         <Edit className="h-4 w-4" />
                       </Button>
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => handleDeleteWeight(stat.id)}
                         className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </div>
                   </div>
                 </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}