import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, PiggyBank, Activity, ChefHat, CalendarPlus, PenTool } from "lucide-react";
import { useNavigate } from "react-router-dom";
export const QuickActions = () => {
  const navigate = useNavigate();
  
  const actions = [{
    icon: PiggyBank,
    label: "Add Expense",
    color: "text-red-400",
    action: () => navigate("/financial")
  }, {
    icon: Activity,
    label: "Log Workout",
    color: "text-green-400",
    action: () => navigate("/gym")
  }, {
    icon: ChefHat,
    label: "Plan Meal",
    color: "text-yellow-400"
  }, {
    icon: CalendarPlus,
    label: "New Appointment",
    color: "text-blue-400"
  }, {
    icon: PenTool,
    label: "Quick Note",
    color: "text-purple-400"
  }];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
              onClick={action.action || (() => {})}
            >
              <action.icon className={`h-6 w-6 ${action.color}`} />
              <span className="text-sm font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};