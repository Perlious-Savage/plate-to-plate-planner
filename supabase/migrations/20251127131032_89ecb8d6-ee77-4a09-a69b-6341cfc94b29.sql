-- Add day_of_week and meal_type columns to menu_items
ALTER TABLE public.menu_items
ADD COLUMN day_of_week text,
ADD COLUMN meal_type text;

-- Add check constraints for valid values
ALTER TABLE public.menu_items
ADD CONSTRAINT valid_day_of_week 
CHECK (day_of_week IS NULL OR day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'));

ALTER TABLE public.menu_items
ADD CONSTRAINT valid_meal_type 
CHECK (meal_type IS NULL OR meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snacks'));