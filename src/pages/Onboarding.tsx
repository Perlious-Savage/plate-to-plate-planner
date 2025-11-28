import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, User, Target, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const goals = [
  { value: "lose_weight", label: "Lose Weight", icon: "📉" },
  { value: "gain_muscle", label: "Gain Muscle", icon: "💪" },
  { value: "more_protein", label: "More Protein", icon: "🥩" },
  { value: "balanced_diet", label: "Balanced Diet", icon: "⚖️" },
  { value: "low_carb", label: "Low Carb", icon: "🥗" },
  { value: "high_fiber", label: "High Fiber", icon: "🌾" },
];

const commonAllergies = [
  "Peanuts", "Tree nuts", "Milk", "Eggs", "Fish", "Shellfish", "Soy", "Wheat", "Gluten"
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState("");
  const [goal, setGoal] = useState("");
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies(prev =>
      prev.includes(allergy)
        ? prev.filter(a => a !== allergy)
        : [...prev, allergy]
    );
  };

  const addCustomAllergy = () => {
    if (customAllergy.trim() && !selectedAllergies.includes(customAllergy.trim())) {
      setSelectedAllergies(prev => [...prev, customAllergy.trim()]);
      setCustomAllergy("");
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          weight: parseFloat(weight),
          height: parseFloat(height),
          gender,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Upsert goal (update if exists, insert if not)
      const { error: goalError } = await supabase
        .from("user_goals")
        .upsert(
          {
            user_id: user.id,
            goal_type: goal,
          },
          {
            onConflict: "user_id",
          }
        );

      if (goalError) throw goalError;

      // Delete existing allergies and insert new ones
      await supabase
        .from("user_allergies")
        .delete()
        .eq("user_id", user.id);

      // Insert allergies
      if (selectedAllergies.length > 0) {
        const { error: allergiesError } = await supabase
          .from("user_allergies")
          .insert(
            selectedAllergies.map(allergy => ({
              user_id: user.id,
              allergy_name: allergy,
            }))
          );

        if (allergiesError) throw allergiesError;
      }

      toast({
        title: "Profile completed!",
        description: "Let's start optimizing your meals.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <Card className="w-full max-w-2xl shadow-large border-0 bg-gradient-card">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            {step === 1 ? <User className="w-5 h-5 text-primary" /> : step === 2 ? <Target className="w-5 h-5 text-primary" /> : <AlertCircle className="w-5 h-5 text-primary" />}
            <CardDescription>Step {step} of 3</CardDescription>
          </div>
          <CardTitle className="text-2xl font-display">
            {step === 1 ? "Tell us about yourself" : step === 2 ? "What's your goal?" : "Any allergies?"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="70.5"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="175"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <RadioGroup value={gender} onValueChange={setGender}>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="male" />
                      <Label htmlFor="male" className="cursor-pointer">Male</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="female" />
                      <Label htmlFor="female" className="cursor-pointer">Female</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="other" />
                      <Label htmlFor="other" className="cursor-pointer">Other</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <RadioGroup value={goal} onValueChange={setGoal}>
                <div className="grid grid-cols-2 gap-3">
                  {goals.map((g) => (
                    <div key={g.value} className="relative">
                      <RadioGroupItem value={g.value} id={g.value} className="peer sr-only" />
                      <Label
                        htmlFor={g.value}
                        className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer hover:border-primary/50 transition-all"
                      >
                        <span className="text-3xl mb-2">{g.icon}</span>
                        <span className="font-medium text-sm text-center">{g.label}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-3">
                <Label>Common Allergies</Label>
                <div className="flex flex-wrap gap-2">
                  {commonAllergies.map((allergy) => (
                    <Badge
                      key={allergy}
                      variant={selectedAllergies.includes(allergy) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/10 transition-colors px-3 py-1.5"
                      onClick={() => toggleAllergy(allergy)}
                    >
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-allergy">Add Custom Allergy</Label>
                <div className="flex gap-2">
                  <Input
                    id="custom-allergy"
                    value={customAllergy}
                    onChange={(e) => setCustomAllergy(e.target.value)}
                    placeholder="Enter allergy name"
                    className="h-11"
                    onKeyPress={(e) => e.key === "Enter" && addCustomAllergy()}
                  />
                  <Button type="button" onClick={addCustomAllergy} variant="outline">
                    Add
                  </Button>
                </div>
              </div>
              {selectedAllergies.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Allergies</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedAllergies.map((allergy) => (
                      <Badge key={allergy} variant="secondary" className="px-3 py-1.5">
                        {allergy}
                        <button
                          onClick={() => toggleAllergy(allergy)}
                          className="ml-2 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              onClick={() => {
                if (step < 3) {
                  setStep(step + 1);
                } else {
                  handleComplete();
                }
              }}
              disabled={
                loading ||
                (step === 1 && (!weight || !height || !gender)) ||
                (step === 2 && !goal)
              }
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : step === 3 ? (
                "Complete Setup"
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
