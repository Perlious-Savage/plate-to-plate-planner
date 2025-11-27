import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Upload } from "lucide-react";

export default function MenuManagement() {
  const [menus, setMenus] = useState<any[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuName, setMenuName] = useState("");
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    fiber: "",
    category: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchMenus();
  }, []);

  useEffect(() => {
    if (selectedMenu) {
      fetchMenuItems(selectedMenu);
    }
  }, [selectedMenu]);

  const fetchMenus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("menus")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMenus(data);
      if (data.length > 0 && !selectedMenu) {
        setSelectedMenu(data[0].id);
      }
    }
  };

  const fetchMenuItems = async (menuId: string) => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("menu_id", menuId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMenuItems(data);
    }
  };

  const createMenu = async () => {
    if (!menuName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a menu name",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("menus")
      .insert({
        user_id: user.id,
        menu_name: menuName,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Menu created!",
      description: `"${menuName}" has been added`,
    });

    setMenuName("");
    fetchMenus();
    if (data) {
      setSelectedMenu(data.id);
    }
  };

  const addMenuItem = async () => {
    if (!selectedMenu || !itemForm.name.trim()) {
      toast({
        title: "Error",
        description: "Please fill in the item name",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("menu_items").insert({
      menu_id: selectedMenu,
      name: itemForm.name,
      description: itemForm.description,
      calories: itemForm.calories ? parseFloat(itemForm.calories) : null,
      protein: itemForm.protein ? parseFloat(itemForm.protein) : null,
      carbs: itemForm.carbs ? parseFloat(itemForm.carbs) : null,
      fats: itemForm.fats ? parseFloat(itemForm.fats) : null,
      fiber: itemForm.fiber ? parseFloat(itemForm.fiber) : null,
      category: itemForm.category,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Item added!",
      description: `"${itemForm.name}" has been added to the menu`,
    });

    setItemForm({
      name: "",
      description: "",
      calories: "",
      protein: "",
      carbs: "",
      fats: "",
      fiber: "",
      category: "",
    });

    fetchMenuItems(selectedMenu);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMenu) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split("\n").map(row => row.split(","));
      const headers = rows[0].map(h => h.trim().toLowerCase());
      
      const items = rows.slice(1).filter(row => row.length > 1).map(row => {
        const item: any = { menu_id: selectedMenu };
        headers.forEach((header, index) => {
          const value = row[index]?.trim();
          if (value) {
            if (header === 'day_of_week' || header === 'day') item.day_of_week = value;
            else if (header === 'meal_type' || header === 'meal') item.meal_type = value;
            else if (['calories', 'protein', 'carbs', 'fats', 'fiber'].includes(header)) {
              item[header] = parseFloat(value) || null;
            } else {
              item[header] = value;
            }
          }
        });
        return item;
      });

      const { error } = await supabase.from("menu_items").insert(items);
      
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success!",
          description: `Added ${items.length} items from CSV`,
        });
        fetchMenuItems(selectedMenu);
      }
    };
    reader.readAsText(file);
  };

  const deleteMenuItem = async (itemId: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", itemId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Item deleted",
      description: "Menu item has been removed",
    });

    if (selectedMenu) {
      fetchMenuItems(selectedMenu);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-display font-bold">Menu Management</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {/* Menus List */}
          <Card className="shadow-medium border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle>Your Menus</CardTitle>
              <CardDescription>Create and manage your menus</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Menu name..."
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && createMenu()}
                />
                <Button onClick={createMenu} size="icon" className="bg-gradient-primary">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {menus.map((menu) => (
                  <Button
                    key={menu.id}
                    variant={selectedMenu === menu.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedMenu(menu.id)}
                  >
                    {menu.menu_name}
                  </Button>
                ))}
                {menus.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No menus yet. Create one to get started!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Menu Items */}
          <div className="md:col-span-2 space-y-6">
            {selectedMenu ? (
              <>
                <Card className="shadow-medium border-0 bg-gradient-card">
              <CardHeader>
                <CardTitle>Add Menu Items</CardTitle>
                <CardDescription>Add items manually or upload a CSV file</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <Label htmlFor="csv-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-accent transition-colors">
                      <Upload className="h-5 w-5" />
                      <span>Upload CSV (name, description, calories, protein, carbs, fats, fiber, category, day_of_week, meal_type)</span>
                    </div>
                  </Label>
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                </div>
              </CardContent>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="item-name">Item Name *</Label>
                        <Input
                          id="item-name"
                          value={itemForm.name}
                          onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                          placeholder="e.g., Grilled Chicken Salad"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Input
                          id="category"
                          value={itemForm.category}
                          onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                          placeholder="e.g., Main Course"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={itemForm.description}
                        onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                        placeholder="Brief description of the dish..."
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-5 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="calories">Calories</Label>
                        <Input
                          id="calories"
                          type="number"
                          step="0.1"
                          value={itemForm.calories}
                          onChange={(e) => setItemForm({ ...itemForm, calories: e.target.value })}
                          placeholder="450"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="protein">Protein (g)</Label>
                        <Input
                          id="protein"
                          type="number"
                          step="0.1"
                          value={itemForm.protein}
                          onChange={(e) => setItemForm({ ...itemForm, protein: e.target.value })}
                          placeholder="35"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="carbs">Carbs (g)</Label>
                        <Input
                          id="carbs"
                          type="number"
                          step="0.1"
                          value={itemForm.carbs}
                          onChange={(e) => setItemForm({ ...itemForm, carbs: e.target.value })}
                          placeholder="25"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fats">Fats (g)</Label>
                        <Input
                          id="fats"
                          type="number"
                          step="0.1"
                          value={itemForm.fats}
                          onChange={(e) => setItemForm({ ...itemForm, fats: e.target.value })}
                          placeholder="15"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fiber">Fiber (g)</Label>
                        <Input
                          id="fiber"
                          type="number"
                          step="0.1"
                          value={itemForm.fiber}
                          onChange={(e) => setItemForm({ ...itemForm, fiber: e.target.value })}
                          placeholder="8"
                        />
                      </div>
                    </div>

                    <Button onClick={addMenuItem} className="w-full bg-gradient-primary">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </CardContent>
                </Card>

                <Card className="shadow-medium border-0 bg-gradient-card">
                  <CardHeader>
                    <CardTitle>Menu Items</CardTitle>
                    <CardDescription>
                      {menuItems.length} item{menuItems.length !== 1 ? "s" : ""} in this menu
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {menuItems.map((item) => (
                        <Card key={item.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold">{item.name}</h3>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                              )}
                              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                {item.calories && <span>🔥 {item.calories} cal</span>}
                                {item.protein && <span>🥩 {item.protein}g protein</span>}
                                {item.carbs && <span>🍞 {item.carbs}g carbs</span>}
                                {item.fats && <span>🥑 {item.fats}g fats</span>}
                                {item.fiber && <span>🌾 {item.fiber}g fiber</span>}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMenuItem(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                      {menuItems.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          No items in this menu yet. Add your first item!
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="shadow-medium border-0 bg-gradient-card">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Upload className="h-16 w-16 text-muted-foreground mb-4 opacity-30" />
                  <p className="text-muted-foreground text-center">
                    Select or create a menu to start adding items
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
