-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_goals table
CREATE TABLE public.user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('lose_weight', 'gain_muscle', 'more_protein', 'balanced_diet', 'low_carb', 'high_fiber')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_allergies table
CREATE TABLE public.user_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  allergy_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, allergy_name)
);

-- Create menus table
CREATE TABLE public.menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  menu_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID REFERENCES public.menus(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  calories DECIMAL(6,2),
  protein DECIMAL(5,2),
  carbs DECIMAL(5,2),
  fats DECIMAL(5,2),
  fiber DECIMAL(5,2),
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create food_analyses table
CREATE TABLE public.food_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT,
  detected_items JSONB,
  suggestions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policies for user_goals
CREATE POLICY "Users can view their own goals"
  ON public.user_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON public.user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON public.user_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON public.user_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for user_allergies
CREATE POLICY "Users can view their own allergies"
  ON public.user_allergies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own allergies"
  ON public.user_allergies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own allergies"
  ON public.user_allergies FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for menus
CREATE POLICY "Users can view their own menus"
  ON public.menus FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own menus"
  ON public.menus FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own menus"
  ON public.menus FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for menu_items
CREATE POLICY "Users can view items from their own menus"
  ON public.menu_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.menus
    WHERE menus.id = menu_items.menu_id
    AND menus.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert items to their own menus"
  ON public.menu_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.menus
    WHERE menus.id = menu_items.menu_id
    AND menus.user_id = auth.uid()
  ));

CREATE POLICY "Users can update items in their own menus"
  ON public.menu_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.menus
    WHERE menus.id = menu_items.menu_id
    AND menus.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete items from their own menus"
  ON public.menu_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.menus
    WHERE menus.id = menu_items.menu_id
    AND menus.user_id = auth.uid()
  ));

-- Create policies for food_analyses
CREATE POLICY "Users can view their own food analyses"
  ON public.food_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own food analyses"
  ON public.food_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own food analyses"
  ON public.food_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to handle profile updates
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for profiles updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();