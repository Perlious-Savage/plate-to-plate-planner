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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Mesh Gradient */}
      <div className="fixed inset-0 bg-gradient-mesh opacity-60 pointer-events-none" />
      
      <header className="relative border-b bg-card/80 backdrop-blur-xl shadow-soft">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-medium hover:shadow-glow transition-shadow">
              <span className="text-2xl">🥗</span>
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold bg-gradient-primary bg-clip-text text-transparent">NutriSwap</h1>
              <p className="text-xs text-muted-foreground">Your Personalized Meal Assistant</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="hover:bg-destructive/10 hover:text-destructive transition-colors">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="relative container mx-auto px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="animate-fade-in">
            <h2 className="text-3xl font-bold mb-2">Welcome Back! 👋</h2>
            <p className="text-muted-foreground">Track your meals and discover healthier alternatives</p>
          </div>

          {/* Profile Summary */}
          <Card className="shadow-large bg-gradient-card border border-border/50 backdrop-blur-sm animate-fade-in overflow-hidden group hover:shadow-glow transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity" />
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-medium">
                      <User className="w-5 h-5 text-primary-foreground" />
                    </div>
                    Your Health Profile
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                      <span className="text-sm font-medium text-primary">
                        {goal ? goalLabels[goal.goal_type] : "Not set"}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/onboarding")} className="hover:bg-primary hover:text-primary-foreground transition-colors">
                  Edit Profile
                </Button>
              </div>
            </CardHeader>
            {profile && (
              <CardContent className="relative">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">Weight</div>
                    <div className="text-2xl font-bold text-foreground">{profile.weight}<span className="text-sm text-muted-foreground ml-1">kg</span></div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">Height</div>
                    <div className="text-2xl font-bold text-foreground">{profile.height}<span className="text-sm text-muted-foreground ml-1">cm</span></div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">Gender</div>
                    <div className="text-2xl font-bold text-foreground capitalize">{profile.gender}</div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <Card 
              className="relative shadow-large border border-border/50 backdrop-blur-sm cursor-pointer group overflow-hidden hover:shadow-glow transition-all duration-300 bg-gradient-card" 
              onClick={() => navigate("/analyze")}
            >
              <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity" />
              <CardHeader className="relative p-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-medium group-hover:scale-110 group-hover:shadow-glow transition-all duration-300">
                    <Camera className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">Analyze Meal</CardTitle>
                    <CardDescription className="text-sm">Snap a photo of your plate and receive personalized swap suggestions</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card 
              className="relative shadow-large border border-border/50 backdrop-blur-sm cursor-pointer group overflow-hidden hover:shadow-glow transition-all duration-300 bg-gradient-card" 
              onClick={() => navigate("/menu")}
            >
              <div className="absolute inset-0 bg-gradient-secondary opacity-0 group-hover:opacity-10 transition-opacity" />
              <CardHeader className="relative p-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-secondary flex items-center justify-center shadow-medium group-hover:scale-110 group-hover:shadow-glow transition-all duration-300">
                    <Menu className="w-8 h-8 text-secondary-foreground" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2 group-hover:text-secondary transition-colors">Manage Menu</CardTitle>
                    <CardDescription className="text-sm">Upload your weekly menu and customize meal options</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Recent Analyses */}
          <Card className="shadow-large border border-border/50 backdrop-blur-sm bg-gradient-card animate-fade-in overflow-hidden" style={{ animationDelay: "0.2s" }}>
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-medium">
                      <FileText className="w-5 h-5 text-accent-foreground" />
                    </div>
                    Recent Analyses
                  </CardTitle>
                  <CardDescription className="mt-1">Your meal analysis history</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {recentAnalyses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground text-sm">No analyses yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Start by analyzing your first meal!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentAnalyses.map((analysis) => {
                    const suggestions = analysis.suggestions || {};
                    const date = new Date(analysis.created_at);
                    return (
                      <div key={analysis.id} className="p-5 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/50 space-y-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
                                <span className="text-xs font-semibold text-primary">
                                  {suggestions.day_of_week || 'Unknown'}
                                </span>
                              </div>
                              <div className="px-2.5 py-1 rounded-lg bg-secondary/10 border border-secondary/20">
                                <span className="text-xs font-semibold text-secondary">
                                  {suggestions.meal_type || 'Meal'}
                                </span>
                              </div>
                            </div>
                            <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                              {suggestions.calories || 0} <span className="text-lg">kcal</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                              {date.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="p-2 rounded-lg bg-background/50">
                            <div className="text-xs text-muted-foreground">Carbs</div>
                            <div className="text-sm font-bold">{suggestions.carbs || 0}g</div>
                          </div>
                          <div className="p-2 rounded-lg bg-background/50">
                            <div className="text-xs text-muted-foreground">Protein</div>
                            <div className="text-sm font-bold">{suggestions.protein || 0}g</div>
                          </div>
                          <div className="p-2 rounded-lg bg-background/50">
                            <div className="text-xs text-muted-foreground">Fats</div>
                            <div className="text-sm font-bold">{suggestions.fats || 0}g</div>
                          </div>
                          <div className="p-2 rounded-lg bg-background/50">
                            <div className="text-xs text-muted-foreground">Fiber</div>
                            <div className="text-sm font-bold">{suggestions.fiber || 0}g</div>
                          </div>
                        </div>
                        {analysis.detected_items && (
                          <div className="pt-2 border-t border-border/50">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {analysis.detected_items.join(', ')}
                            </p>
                          </div>
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
