import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useFinancial, SubCategory } from '@/contexts/FinancialContext';
import { Trash2, Edit3, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Geolocation } from '@capacitor/geolocation';

interface EditSubCategoryDialogProps {
  subcategory: SubCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditSubCategoryDialog = ({ subcategory, open, onOpenChange }: EditSubCategoryDialogProps) => {
  const { updateSubCategory, deleteSubCategory } = useFinancial();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [formData, setFormData] = useState({
    name: subcategory.name,
    location: subcategory.location || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a subcategory name",
        variant: "destructive"
      });
      return;
    }

    try {
      await updateSubCategory(subcategory.id, { 
        name: formData.name.trim(),
        location: formData.location.trim() 
      });
      toast({
        title: "Success",
        description: "Subcategory updated successfully"
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subcategory",
        variant: "destructive"
      });
    }
  };

  const handleGetLocation = async () => {
    setIsGettingLocation(true);
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      const { latitude, longitude } = coordinates.coords;
      const locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      
      setFormData(prev => ({ ...prev, location: locationString }));
      
      toast({
        title: "Location captured",
        description: `Coordinates: ${locationString}`,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      toast({
        title: "Location error",
        description: "Unable to get your location. Please check permissions.",
        variant: "destructive"
      });
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSubCategory(subcategory.id);
      toast({
        title: "Success",
        description: "Subcategory deleted successfully"
      });
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete subcategory",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Edit Subcategory
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Subcategory Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Restaurants"
                required
              />
            </div>

            <div>
              <Label htmlFor="location">Location (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Downtown, Mall, Airport or coordinates"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetLocation}
                  disabled={isGettingLocation}
                  className="px-3"
                >
                  <MapPin className="h-4 w-4" />
                  {isGettingLocation && <span className="ml-1">...</span>}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <div className="flex-1" />
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Update
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{subcategory.name}"? This action cannot be undone and will affect all transactions associated with this subcategory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};