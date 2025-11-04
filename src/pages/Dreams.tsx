import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, Search, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { useDreams } from "@/contexts/DreamsContext";
import { AddDreamDialog } from "@/components/dreams/add-dream-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Dreams = () => {
  const navigate = useNavigate();
  const { dreams, loading } = useDreams();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredDreams = dreams.filter((dream) => {
    const matchesSearch = dream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dream.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || dream.type === filterType;
    const matchesStatus = filterStatus === "all" || dream.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      general: 'General',
      travel: 'Travel',
      adventure: 'Adventure',
      career: 'Career',
      personal: 'Personal',
      creative: 'Creative',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo size="md" />
            <div className="flex items-center gap-2">
              <AddDreamDialog />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
              >
                <Home className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Dreams</h1>
          <p className="text-muted-foreground">Track and achieve your life goals</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search dreams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="travel">Travel</SelectItem>
              <SelectItem value="adventure">Adventure</SelectItem>
              <SelectItem value="career">Career</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dreams Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading dreams...</p>
          </div>
        ) : filteredDreams.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {dreams.length === 0 ? "No dreams yet. Start by adding your first dream!" : "No dreams match your filters."}
            </p>
            {dreams.length === 0 && <AddDreamDialog />}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDreams.map((dream) => (
              <Card key={dream.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant={getPriorityColor(dream.priority)}>
                      {dream.priority}
                    </Badge>
                    <Badge variant="outline">{getTypeLabel(dream.type)}</Badge>
                  </div>
                  <CardTitle className="text-xl">{dream.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dream.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {dream.description}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{dream.progress_percentage}%</span>
                    </div>
                    <Progress value={dream.progress_percentage} />
                  </div>

                  {dream.target_date && (
                    <p className="text-sm text-muted-foreground">
                      Target: {new Date(dream.target_date).toLocaleDateString()}
                    </p>
                  )}

                  {dream.location && (
                    <p className="text-sm text-muted-foreground">
                      📍 {dream.location}
                    </p>
                  )}

                  {dream.status === 'completed' && dream.completed_at && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                        ✓ Completed {new Date(dream.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dreams;
