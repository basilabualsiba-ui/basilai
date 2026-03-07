import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/ui/file-upload";
import { useState, useEffect } from "react";
import { useDreams } from "@/contexts/DreamsContext";
import { Share2, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";

interface DreamCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dreamId: string;
  dreamTitle: string;
}

export const DreamCompletionDialog = ({ open, onOpenChange, dreamId, dreamTitle }: DreamCompletionDialogProps) => {
  const { updateDream, addDreamPhoto } = useDreams();
  const [notes, setNotes] = useState("");
  const [lessonsLearned, setLessonsLearned] = useState("");
  const [rating, setRating] = useState(5);
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // Trigger confetti animation
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      
      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          particleCount,
          startVelocity: 30,
          spread: 360,
          origin: {
            x: randomInRange(0.1, 0.9),
            y: Math.random() - 0.2
          },
          colors: ['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#32CD32']
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [open]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Upload photo if provided
      let photoUrl: string | undefined;
      if (photo) {
        const fileExt = photo.file.name.split('.').pop();
        const fileName = `${dreamId}-completion-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('wardrobe')
          .upload(fileName, photo.file);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('wardrobe')
            .getPublicUrl(fileName);
          
          photoUrl = publicUrl;
          
          // Add to dream_photos
          await addDreamPhoto({
            dream_id: dreamId,
            photo_url: publicUrl,
            caption: "Completion photo",
            is_before: false,
          });
        }
      }

      // Update dream
      await updateDream(dreamId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        completion_notes: notes,
        lessons_learned: lessonsLearned,
        rating,
        progress_percentage: 100,
      });

      onOpenChange(false);
      setNotes("");
      setLessonsLearned("");
      setRating(5);
      setPhoto(null);
    } catch (error) {
      console.error('Error completing dream:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = () => {
    const shareText = `🎉 I just achieved my dream: ${dreamTitle}! ${notes ? '\n\n' + notes : ''}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Dream Achieved!',
        text: shareText,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareText);
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Achievement copied to clipboard!');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-yellow-500" />
            Congratulations! 🎉
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-lg">
            You've achieved your dream: <strong>{dreamTitle}</strong>
          </p>

          <div className="space-y-2">
            <Label>Rate your experience (1-5 stars)</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="text-3xl transition-all hover:scale-110"
                >
                  {star <= rating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Completion Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel? What did you experience?"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lessons">Lessons Learned</Label>
            <Textarea
              id="lessons"
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
              placeholder="What did you learn from this journey?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Add a Celebration Photo (Optional)</Label>
            <FileUpload
              accept="image/*"
              onChange={(file, preview) => setPhoto({ file, preview })}
              value={photo?.preview}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleShare}
              className="flex-1 gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share Achievement
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Saving..." : "Complete Dream"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
