import React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSchedule } from '@/contexts/ScheduleContext';

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivityAdded: () => void;
  editActivity?: any;
}

export const AddActivityDialog: React.FC<AddActivityDialogProps> = ({
  open,
  onOpenChange,
  onActivityAdded,
  editActivity
}) => {
  const [title, setTitle] = useState('');
  const [activityType, setActivityType] = useState<'work' | 'exercise' | 'personal' | 'appointment' | 'other'>('personal');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [isOneDayOnly, setIsOneDayOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const { addActivity, updateActivity, dailyActivities } = useSchedule();

  const daysOfWeek = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 7, label: 'Sunday' }
  ];

  useEffect(() => {
    if (open) {
      if (editActivity) {
        // Pre-fill form when editing
        setTitle(editActivity.title || '');
        setActivityType(editActivity.activityType || 'personal');
        setStartTime(editActivity.startTime || '');
        setEndTime(editActivity.endTime || '');
        setSelectedDays(editActivity.days_of_week || []);
        setIsOneDayOnly(!editActivity.is_recurring);
        if (!editActivity.is_recurring && editActivity.date) {
          setSelectedDate(new Date(editActivity.date));
        }
      } else {
        // Reset form when adding new
        setTitle('');
        setActivityType('personal');
        setStartTime('');
        setEndTime('');
        setSelectedDays([]);
        setIsOneDayOnly(false);
        setSelectedDate(undefined);
      }
    }
  }, [open, editActivity]);

  const handleDayToggle = (dayValue: number) => {
    setSelectedDays(prev => 
      prev.includes(dayValue) 
        ? prev.filter(day => day !== dayValue)
        : [...prev, dayValue]
    );
  };

  const handleSubmit = async () => {
    // Validation based on activity type
    if (!title.trim() || !startTime.trim()) return;
    if (isOneDayOnly && !selectedDate) return;
    if (!isOneDayOnly && selectedDays.length === 0) return;

    setIsLoading(true);
    try {
      const activityData = {
        title: title.trim(),
        activity_type: activityType,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        date: isOneDayOnly && selectedDate 
          ? selectedDate.toISOString().split('T')[0] 
          : new Date().toISOString().split('T')[0],
        is_completed: false,
        is_recurring: !isOneDayOnly,
        recurrence_type: isOneDayOnly ? undefined : 'weekly' as const,
        created_date: new Date().toISOString().split('T')[0],
        days_of_week: isOneDayOnly ? [] : selectedDays
      };

      if (editActivity) {
        await updateActivity(editActivity.id, activityData);
      } else {
        await addActivity(activityData);
      }

      // Reset form
      setTitle('');
      setActivityType('personal');
      setStartTime('');
      setEndTime('');
      setSelectedDays([]);
      setIsOneDayOnly(false);
      setSelectedDate(undefined);
      
      onActivityAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editActivity ? 'Edit Activity' : 'Add New Activity'}</DialogTitle>
          <DialogDescription>
            {editActivity ? 'Edit your activity details.' : 'Add a new activity to your schedule.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Activity title"
            />
          </div>

          <div>
            <Label htmlFor="type">Type</Label>
            <Select value={activityType} onValueChange={(value: any) => setActivityType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="exercise">Exercise</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="appointment">Appointment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
              {!startTime && (
                <p className="text-sm text-destructive mt-1">Start time is required</p>
              )}
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="one-day-only"
              checked={isOneDayOnly}
              onCheckedChange={setIsOneDayOnly}
            />
            <Label htmlFor="one-day-only">One day only</Label>
          </div>

          {isOneDayOnly ? (
            <div>
              <Label>Select Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {!selectedDate && isOneDayOnly && (
                <p className="text-sm text-destructive mt-1">Please select a date</p>
              )}
            </div>
          ) : (
            <div>
              <Label>Days of Week</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {daysOfWeek.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={selectedDays.includes(day.value)}
                      onCheckedChange={() => handleDayToggle(day.value)}
                    />
                    <Label htmlFor={`day-${day.value}`} className="text-sm">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedDays.length === 0 && !isOneDayOnly && (
                <p className="text-sm text-destructive mt-1">Please select at least one day</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !title.trim() || 
              !startTime.trim() || 
              (isOneDayOnly && !selectedDate) ||
              (!isOneDayOnly && selectedDays.length === 0) ||
              isLoading
            }
          >
            {isLoading ? 'Saving...' : editActivity ? 'Update Activity' : 'Add Activity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};