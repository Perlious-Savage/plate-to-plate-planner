import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MealAnalysis() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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
    toast({
      title: "Analysis feature coming soon!",
      description: "AI meal analysis will be available shortly",
    });
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
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-large border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle>Take or Upload Photo</CardTitle>
              <CardDescription>Get personalized meal suggestions based on your goals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedImage ? (
                <div className="space-y-4">
                  <img src={selectedImage} alt="Selected meal" className="w-full rounded-lg" />
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setSelectedImage(null)}>
                      Change Photo
                    </Button>
                    <Button className="flex-1 bg-gradient-primary" onClick={analyzeImage}>
                      Analyze Meal
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
        </div>
      </main>
    </div>
  );
}
