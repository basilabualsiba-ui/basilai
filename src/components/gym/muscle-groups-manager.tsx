import { useState } from 'react';
import { useGym } from '@/contexts/GymContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileUpload } from '@/components/ui/file-upload';
import { Plus, Edit, Trash2, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const colorOptions = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', 
  '#feca57', '#ff9ff3', '#54a0ff', '#ee5a24',
  '#ff7675', '#74b9ff', '#a29bfe', '#fd79a8',
  '#fdcb6e', '#6c5ce7', '#e17055', '#00b894'
];

const emojiOptions = [
  '💪', '🏋️', '🤸', '🦵', '🏃', '❤️', '🎯', '⚡',
  '🔥', '✨', '💥', '🚀', '⭐', '🌟', '💎', '🏆'
];

interface MuscleGroupFormData {
  name: string;
  icon: string;
  color: string;
  photo_url: string | null;
}

export function MuscleGroupsManager() {
  const { muscleGroups, addMuscleGroup, updateMuscleGroup, deleteMuscleGroup, exercises } = useGym();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [formData, setFormData] = useState<MuscleGroupFormData>({
    name: '',
    icon: '💪',
    color: '#ff6b6b',
    photo_url: null
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      icon: '💪',
      color: '#ff6b6b',
      photo_url: null
    });
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `muscle-groups/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('muscle-group-photos')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from('muscle-group-photos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a muscle group name",
        variant: "destructive",
      });
      return;
    }

    if (!photoFile && !editingGroup) {
      toast({
        title: "Validation Error",
        description: "Please upload a photo for the muscle group",
        variant: "destructive",
      });
      return;
    }

    if (!photoFile && editingGroup && !formData.photo_url) {
      toast({
        title: "Validation Error",
        description: "Please upload a photo for the muscle group",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate names
    const isDuplicate = muscleGroups.some(mg => 
      mg.name.toLowerCase() === formData.name.toLowerCase() && 
      mg.id !== editingGroup
    );

    if (isDuplicate) {
      toast({
        title: "Validation Error",
        description: "A muscle group with this name already exists",
        variant: "destructive",
      });
      return;
    }

    try {
      let photoUrl = formData.photo_url;
      
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
        if (!photoUrl) {
          toast({
            title: "Upload Error",
            description: "Failed to upload photo. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      const submissionData = { ...formData, photo_url: photoUrl };

      if (editingGroup) {
        await updateMuscleGroup(editingGroup, submissionData);
        setEditingGroup(null);
      } else {
        await addMuscleGroup(submissionData);
        setIsAddDialogOpen(false);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving muscle group:', error);
    }
  };

  const handleEdit = (group: any) => {
    setFormData({
      name: group.name,
      icon: group.icon,
      color: group.color,
      photo_url: group.photo_url
    });
    setPhotoPreview(group.photo_url);
    setEditingGroup(group.id);
  };

  const handleCancelEdit = () => {
    setEditingGroup(null);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteMuscleGroup(id);
  };

  const getExerciseCount = (muscleGroupName: string) => {
    return exercises.filter(ex => ex.muscle_group === muscleGroupName).length;
  };

  return (
    <div className="space-y-6">
      <div className="mt-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Muscle Groups</h2>
          <p className="text-muted-foreground">Manage your muscle group categories</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 mt-4 bg-gym hover:bg-gym/90 text-white">
              <Plus className="h-4 w-4" />
              Add Muscle Group
            </Button>
          </DialogTrigger>
          <DialogContent className="border-gym/30 bg-gradient-to-br from-background via-background to-gym/5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gym/20">
                  <Plus className="h-4 w-4 text-gym" />
                </div>
                Add New Muscle Group
              </DialogTitle>
              <DialogDescription>
                Create a new muscle group category for organizing exercises
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Chest, Back, Legs"
                  className="focus:border-gym focus:ring-gym/30"
                />
              </div>
              
              <FileUpload
                value={photoPreview}
                onChange={(file, previewUrl) => {
                  setPhotoFile(file);
                  setPhotoPreview(previewUrl);
                }}
                placeholder="Upload muscle group photo"
              />

              <div>
                <Label>Color (for accent)</Label>
                <div className="grid grid-cols-8 gap-2 mt-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color ? 'border-foreground scale-110' : 'border-border'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gym hover:bg-gym/90 text-white">Add Muscle Group</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {muscleGroups.map((group) => {
          const exerciseCount = getExerciseCount(group.name);
          const isEditing = editingGroup === group.id;
          
          return (
            <Card key={group.id} className="relative">
              <CardHeader className="pb-3">
                {isEditing ? (
                    <form onSubmit={handleSubmit} className="space-y-3">
                     <Input
                       value={formData.name}
                       onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                       className="text-lg font-semibold"
                     />
                     
                     <FileUpload
                       value={photoPreview}
                       onChange={(file, previewUrl) => {
                         setPhotoFile(file);
                         setPhotoPreview(previewUrl);
                       }}
                       placeholder="Update muscle group photo"
                     />

                     <div className="grid grid-cols-6 gap-1">
                       {colorOptions.slice(0, 12).map((color) => (
                         <button
                           key={color}
                           type="button"
                           onClick={() => setFormData({ ...formData, color })}
                           className={`w-6 h-6 rounded border ${
                             formData.color === color ? 'border-foreground' : 'border-border'
                           }`}
                           style={{ backgroundColor: color }}
                         />
                       ))}
                     </div>

                    <div className="flex gap-2">
                      <Button type="submit" size="sm" className="flex-1 bg-gym hover:bg-gym/90 text-white">Save</Button>
                      <Button type="button" variant="outline" size="sm" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted border-2" style={{ borderColor: group.color }}>
                        {group.photo_url ? (
                          <img 
                            src={group.photo_url} 
                            alt={group.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div 
                            className="w-full h-full flex items-center justify-center text-white text-xl font-bold"
                            style={{ backgroundColor: group.color }}
                          >
                            📷
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(group)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-gym/30">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Muscle Group</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{group.name}"? 
                                {exerciseCount > 0 && (
                                  <span className="text-destructive font-medium">
                                    {' '}This will affect {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(group.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </>
                )}
              </CardHeader>
              
              {!isEditing && (
                <CardContent>
                  <div style={{ color: group.color }} className="text-xs font-medium">
                    <Palette className="inline h-3 w-3 mr-1" />
                    {group.color}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {muscleGroups.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💪</div>
          <h3 className="text-lg font-medium text-foreground mb-2">No muscle groups yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first muscle group to start organizing exercises
          </p>
        </div>
      )}
    </div>
  );
}