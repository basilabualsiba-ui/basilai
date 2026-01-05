import { useState } from 'react';
import { useGym } from '@/contexts/GymContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit2, Trash2, Dumbbell, Link, Image, Play, Download } from 'lucide-react';
import { ExerciseInfoDialog } from './exercise-info-dialog';
import { AlternativesManager } from './alternatives-manager';

const difficultyLevels = ['beginner', 'intermediate', 'advanced'];
export function ExercisesList() {
  const {
    exercises,
    addExercise,
    updateExercise,
    deleteExercise,
    muscleGroups,
    exerciseSets
  } = useGym();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMuscle, setFilterMuscle] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    muscle_group: '',
    side_muscle_groups: [] as string[],
    instructions: '',
    difficulty_level: 'beginner',
    equipment: '',
    video_url: '',
    photo_url: ''
  });
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [isExerciseInfoOpen, setIsExerciseInfoOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) || exercise.muscle_group.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMuscle = !filterMuscle || filterMuscle === 'all' || exercise.muscle_group === filterMuscle;
    return matchesSearch && matchesMuscle;
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingExercise) {
      await updateExercise(editingExercise.id, formData);
      setEditingExercise(null);
    } else {
      await addExercise(formData);
      setIsAddDialogOpen(false);
    }
    setFormData({
      name: '',
      muscle_group: '',
      side_muscle_groups: [],
      instructions: '',
      difficulty_level: 'beginner',
      equipment: '',
      video_url: '',
      photo_url: ''
    });
  };
  const handleEdit = (exercise: any) => {
    setEditingExercise(exercise);
    setFormData({
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      side_muscle_groups: exercise.side_muscle_groups || [],
      instructions: exercise.instructions || '',
      difficulty_level: exercise.difficulty_level || 'beginner',
      equipment: exercise.equipment || '',
      video_url: exercise.video_url || '',
      photo_url: exercise.photo_url || ''
    });
  };
  const handleExerciseClick = (exercise: any) => {
    setSelectedExercise(exercise);
    setIsExerciseInfoOpen(true);
  };
  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-exercise', {
        body: { url: importUrl }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Fill the form with extracted data
      setFormData({
        name: data.name,
        muscle_group: data.primaryMuscleGroup,
        side_muscle_groups: data.secondaryMuscleGroups,
        difficulty_level: data.difficulty.toLowerCase(),
        instructions: '',
        equipment: '',
        video_url: '',
        photo_url: ''
      });

      setImportUrl('');
      toast({
        title: "Success",
        description: `Exercise data loaded from "${data.name}"`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import exercise from URL",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };
  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate PR for each exercise
  const getExercisePR = (exerciseId: string): number | null => {
    const exerciseSetsForExercise = exerciseSets.filter(
      set => set.exercise_id === exerciseId && set.weight && set.completed_at
    );
    
    if (exerciseSetsForExercise.length === 0) return null;
    
    return Math.max(...exerciseSetsForExercise.map(set => Number(set.weight) || 0));
  };
  return <div className="space-y-6">
      <Tabs defaultValue="exercises" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="exercises" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Exercises</TabsTrigger>
          <TabsTrigger value="alternatives" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Alternatives</TabsTrigger>
        </TabsList>

        <TabsContent value="exercises" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mt-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Exercise Library</h2>
              <p className="text-sm text-muted-foreground">Manage your exercise database</p>
            </div>
        
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25">
              <Plus className="h-4 w-4" />
              Add Exercise
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Exercise</DialogTitle>
              <DialogDescription>
                Create a new exercise for your library
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Auto Import Section */}
              <div className="space-y-3 p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl border border-green-500/20">
                <Label className="text-sm font-semibold">Quick Import</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="muscleandstrength.com URL..."
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    className="flex-1 rounded-xl"
                  />
                  <Button 
                    type="button"
                    onClick={handleImportFromUrl} 
                    disabled={isImporting || !importUrl.trim()}
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                  >
                    {isImporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Import
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Import
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="name">Exercise Name</Label>
                <Input id="name" value={formData.name} onChange={e => setFormData({
                ...formData,
                name: e.target.value
              })} placeholder="e.g., Bench Press" required className="rounded-xl" />
              </div>
              <div>
                <Label htmlFor="muscle_group">Primary Muscle Group</Label>
                <Select value={formData.muscle_group} onValueChange={value => setFormData({
                ...formData,
                muscle_group: value
              })} required>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select primary muscle group" />
                  </SelectTrigger>
                  <SelectContent>
                    {muscleGroups.map(group => <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="side_muscle_groups">Side Muscle Groups (Optional)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto p-2 rounded-xl bg-muted/30">
                  {muscleGroups.filter(group => group.name !== formData.muscle_group).map(group => (
                    <div key={group.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`side-${group.id}`}
                        checked={formData.side_muscle_groups.includes(group.name)}
                        onChange={(e) => {
                          const newSideGroups = e.target.checked
                            ? [...formData.side_muscle_groups, group.name]
                            : formData.side_muscle_groups.filter(name => name !== group.name);
                          setFormData({ ...formData, side_muscle_groups: newSideGroups });
                        }}
                        className="w-4 h-4 text-green-500 bg-background border-border rounded focus:ring-green-500"
                      />
                      <Label htmlFor={`side-${group.id}`} className="text-sm">{group.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="equipment">Equipment</Label>
                <Input id="equipment" value={formData.equipment} onChange={e => setFormData({
                ...formData,
                equipment: e.target.value
              })} placeholder="e.g., Barbell, Bodyweight" className="rounded-xl" />
              </div>
              <div>
                <Label htmlFor="difficulty_level">Difficulty</Label>
                <Select value={formData.difficulty_level} onValueChange={value => setFormData({
                ...formData,
                difficulty_level: value
              })}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyLevels.map(level => <SelectItem key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Media URLs */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="video_url" className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Video URL
                  </Label>
                  <Input id="video_url" value={formData.video_url} onChange={e => setFormData({
                  ...formData,
                  video_url: e.target.value
                })} placeholder="YouTube embed URL or video link..." className="rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="photo_url" className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Photo URL
                  </Label>
                  <Input id="photo_url" value={formData.photo_url} onChange={e => setFormData({
                  ...formData,
                  photo_url: e.target.value
                })} placeholder="Image URL..." className="rounded-xl" />
                </div>
              </div>

              <div>
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea id="instructions" value={formData.instructions} onChange={e => setFormData({
                ...formData,
                instructions: e.target.value
              })} placeholder="Exercise instructions..." rows={3} className="rounded-xl" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                  Add Exercise
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search exercises..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 rounded-xl border-border/40 bg-card/50" />
        </div>
        <Select value={filterMuscle} onValueChange={setFilterMuscle}>
          <SelectTrigger className="w-full sm:w-48 rounded-xl border-border/40 bg-card/50">
            <SelectValue placeholder="Filter by muscle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Muscles</SelectItem>
            {muscleGroups.map(group => <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Exercise Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredExercises.map(exercise => {
          const pr = getExercisePR(exercise.id);
          return (
            <Card 
              key={exercise.id} 
              className="group relative overflow-hidden border border-border/40 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 cursor-pointer bg-card/50 backdrop-blur-sm"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-3 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1" onClick={() => handleExerciseClick(exercise)}>
                    <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/15 to-emerald-500/10 group-hover:from-green-500/25 group-hover:to-emerald-500/15 transition-all">
                      <Dumbbell className="h-4 w-4 text-green-600" />
                    </div>
                    <CardTitle className="text-base font-semibold">{exercise.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={e => {
                      e.stopPropagation();
                      handleEdit(exercise);
                    }} className="h-8 w-8 p-0 rounded-xl hover:bg-green-500/10">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={e => {
                      e.stopPropagation();
                      deleteExercise(exercise.id);
                    }} className="h-8 w-8 p-0 rounded-xl hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2" onClick={() => handleExerciseClick(exercise)}>
                  <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-xs">{exercise.muscle_group}</Badge>
                  {exercise.side_muscle_groups && exercise.side_muscle_groups.length > 0 && (
                    exercise.side_muscle_groups.slice(0, 2).map(sideGroup => (
                      <Badge key={sideGroup} variant="secondary" className="text-[10px]">
                        {sideGroup}
                      </Badge>
                    ))
                  )}
                  {exercise.side_muscle_groups && exercise.side_muscle_groups.length > 2 && (
                    <Badge variant="secondary" className="text-[10px]">+{exercise.side_muscle_groups.length - 2}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent onClick={() => handleExerciseClick(exercise)} className="relative z-10">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {pr !== null && (
                    <Badge className="bg-gradient-to-r from-amber-500/20 to-orange-500/15 text-amber-600 border-amber-500/30 font-semibold text-xs">
                      🏆 PR: {pr} kg
                    </Badge>
                  )}
                  <Badge className={`text-xs ${getDifficultyColor(exercise.difficulty_level || 'beginner')}`}>
                    {exercise.difficulty_level || 'beginner'}
                  </Badge>
                  {exercise.video_url && <Badge variant="secondary" className="text-xs"><Play className="h-3 w-3" /></Badge>}
                  {exercise.photo_url && <Badge variant="secondary" className="text-xs"><Image className="h-3 w-3" /></Badge>}
                </div>
                {exercise.equipment && (
                  <p className="text-xs text-muted-foreground mb-1">
                    <strong>Equipment:</strong> {exercise.equipment}
                  </p>
                )}
                {exercise.instructions && (
                  <CardDescription className="text-xs line-clamp-2">
                    {exercise.instructions}
                  </CardDescription>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredExercises.length === 0 && (
        <div className="text-center py-16">
          <div className="p-6 rounded-3xl bg-green-500/10 inline-block mb-4">
            <Dumbbell className="h-12 w-12 text-green-500/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No exercises found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filterMuscle ? 'Try adjusting your filters' : 'Add your first exercise to get started'}
          </p>
        </div>
      )}

          {/* Exercise Info Dialog */}
          <ExerciseInfoDialog exercise={selectedExercise} open={isExerciseInfoOpen} onOpenChange={setIsExerciseInfoOpen} />

      {/* Edit Dialog */}
      <Dialog open={!!editingExercise} onOpenChange={open => !open && setEditingExercise(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Exercise</DialogTitle>
            <DialogDescription>
              Update exercise details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Exercise Name</Label>
              <Input id="edit-name" value={formData.name} onChange={e => setFormData({
              ...formData,
              name: e.target.value
            })} placeholder="e.g., Bench Press" required />
            </div>
            <div>
              <Label htmlFor="edit-muscle_group">Primary Muscle Group</Label>
              <Select value={formData.muscle_group} onValueChange={value => setFormData({
              ...formData,
              muscle_group: value
            })} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select primary muscle group" />
                </SelectTrigger>
                <SelectContent>
                  {muscleGroups.map(group => <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-side_muscle_groups">Side Muscle Groups (Optional)</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto">
                {muscleGroups.filter(group => group.name !== formData.muscle_group).map(group => (
                  <div key={group.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`edit-side-${group.id}`}
                      checked={formData.side_muscle_groups.includes(group.name)}
                      onChange={(e) => {
                        const newSideGroups = e.target.checked
                          ? [...formData.side_muscle_groups, group.name]
                          : formData.side_muscle_groups.filter(name => name !== group.name);
                        setFormData({ ...formData, side_muscle_groups: newSideGroups });
                      }}
                      className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                    />
                    <Label htmlFor={`edit-side-${group.id}`} className="text-sm">{group.name}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="edit-equipment">Equipment</Label>
              <Input id="edit-equipment" value={formData.equipment} onChange={e => setFormData({
              ...formData,
              equipment: e.target.value
            })} placeholder="e.g., Barbell, Bodyweight" />
            </div>
            <div>
              <Label htmlFor="edit-difficulty_level">Difficulty</Label>
              <Select value={formData.difficulty_level} onValueChange={value => setFormData({
              ...formData,
              difficulty_level: value
            })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficultyLevels.map(level => <SelectItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Media URLs for Edit */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="edit-video_url" className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Video URL
                </Label>
                <Input id="edit-video_url" value={formData.video_url} onChange={e => setFormData({
                ...formData,
                video_url: e.target.value
              })} placeholder="YouTube embed URL or video link..." />
              </div>
              <div>
                <Label htmlFor="edit-photo_url" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Photo URL
                </Label>
                <Input id="edit-photo_url" value={formData.photo_url} onChange={e => setFormData({
                ...formData,
                photo_url: e.target.value
              })} placeholder="Image URL..." />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-instructions">Instructions</Label>
              <Textarea id="edit-instructions" value={formData.instructions} onChange={e => setFormData({
              ...formData,
              instructions: e.target.value
            })} placeholder="Exercise instructions..." rows={3} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Update Exercise
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditingExercise(null)}>
                Cancel
              </Button>
            </div>
          </form>
          </DialogContent>
        </Dialog>
        </TabsContent>

        <TabsContent value="alternatives" className="mt-6">
          <AlternativesManager />
        </TabsContent>
      </Tabs>
    </div>;
}