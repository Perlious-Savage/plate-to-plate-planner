import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MealAnalysis() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState<string>("");
  const [mealType, setMealType] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage || !dayOfWeek || !mealType) {
      toast({
        title: "Missing information",
        description: "Please select day, meal type, and upload an image",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("analyze-meal", {
        body: {
          imageBase64: selectedImage,
          userId: user.id,
          dayOfWeek,
          mealType,
        },
      });

      if (error) throw error;

      setSuggestions(data.suggestions);
      toast({
        title: "Analysis complete!",
        description: "Check out your personalized suggestions below",
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-display font-bold">Analyze Meal</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="shadow-large border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle>Meal Details</CardTitle>
              <CardDescription>Tell us what meal you're analyzing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Meal Type</Label>
                  <Select value={mealType} onValueChange={setMealType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select meal" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Breakfast", "Lunch", "Dinner", "Snacks"].map(meal => (
                        <SelectItem key={meal} value={meal}>{meal}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-large border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle>Take or Upload Photo</CardTitle>
              <CardDescription>Capture your meal for analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedImage ? (
                <div className="space-y-4">
                  <img src={selectedImage} alt="Selected meal" className="w-full rounded-lg" />
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setSelectedImage(null)}>
                      Change Photo
                    </Button>
                    <Button 
                      className="flex-1 bg-gradient-primary" 
                      onClick={analyzeImage}
                      disabled={analyzing || !dayOfWeek || !mealType}
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        "Analyze Meal"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-12 cursor-pointer hover:border-primary transition-colors">
                  <Camera className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Take or Upload a Photo</p>
                  <p className="text-sm text-muted-foreground">Tap to capture or select from gallery</p>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </CardContent>
          </Card>

          {suggestions && (
            <Card className="shadow-large border-0 bg-gradient-card">
              <CardHeader>
                <CardTitle>AI Suggestions</CardTitle>
                <CardDescription>Personalized swaps from your menu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {suggestions}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
