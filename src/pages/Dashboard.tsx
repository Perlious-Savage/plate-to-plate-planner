import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, Menu, LogOut, User, FileText } from "lucide-react";

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [goal, setGoal] = useState<any>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserData();
    fetchRecentAnalyses();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const [profileRes, goalRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("user_goals").select("*").eq("user_id", user.id).single(),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (goalRes.data) setGoal(goalRes.data);

      // Check if onboarding is complete
      if (!profileRes.data?.weight || !goalRes.data) {
        navigate("/onboarding");
      }
    } catch (error: any) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchRecentAnalyses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("food_analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentAnalyses(data || []);
    } catch (error: any) {
      console.error("Error fetching analyses:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast({
      title: "Signed out",
      description: "Come back soon!",
    });
  };

  const goalLabels: { [key: string]: string } = {
    lose_weight: "Lose Weight",
    gain_muscle: "Gain Muscle",
    more_protein: "More Protein",
    balanced_diet: "Balanced Diet",
    low_carb: "Low Carb",
    high_fiber: "High Fiber",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
              <span className="text-xl">🥗</span>
            </div>
            <h1 className="text-2xl font-display font-bold">NutriSwap</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Summary */}
          <Card className="shadow-medium bg-gradient-card border-0 animate-fade-in">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Your Profile
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Goal: {goal ? goalLabels[goal.goal_type] : "Not set"}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/onboarding")}>
                  Edit
                </Button>
              </div>
            </CardHeader>
            {profile && (
              <CardContent>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Weight:</span>
                    <span className="ml-2 font-medium">{profile.weight} kg</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Height:</span>
                    <span className="ml-2 font-medium">{profile.height} cm</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gender:</span>
                    <span className="ml-2 font-medium capitalize">{profile.gender}</span>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <Card className="shadow-medium hover:shadow-large transition-shadow border-0 bg-gradient-card cursor-pointer group" onClick={() => navigate("/analyze")}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Analyze Meal</CardTitle>
                    <CardDescription>Take a photo and get suggestions</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="shadow-medium hover:shadow-large transition-shadow border-0 bg-gradient-card cursor-pointer group" onClick={() => navigate("/menu")}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Menu className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Manage Menu</CardTitle>
                    <CardDescription>Upload and edit your menu</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Recent Analyses */}
          <Card className="shadow-medium border-0 bg-gradient-card animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Recent Analyses
              </CardTitle>
              <CardDescription>Your meal analysis history</CardDescription>
            </CardHeader>
            <CardContent>
              {recentAnalyses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No analyses yet. Start by taking a photo of your meal!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAnalyses.map((analysis) => {
                    const suggestions = analysis.suggestions || {};
                    const date = new Date(analysis.created_at);
                    return (
                      <div key={analysis.id} className="p-4 rounded-lg bg-muted/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="font-medium text-sm">
                              {suggestions.day_of_week || 'Unknown'} • {suggestions.meal_type || 'Meal'}
                            </div>
                            <div className="text-lg font-bold text-primary">
                              {suggestions.calories || 0} kcal
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {date.toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Carbs: {suggestions.carbs || 0}g</span>
                          <span>Protein: {suggestions.protein || 0}g</span>
                          <span>Fats: {suggestions.fats || 0}g</span>
                          <span>Fiber: {suggestions.fiber || 0}g</span>
                        </div>
                        {analysis.detected_items && (
                          <p className="text-xs text-muted-foreground">
                            {analysis.detected_items.join(', ')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
