import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, userId, dayOfWeek, mealType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Fetch user data
    const [profile, goal, allergies, menus] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('user_goals').select('*').eq('user_id', userId).single(),
      supabase.from('user_allergies').select('*').eq('user_id', userId),
      supabase.from('menus').select('*, menu_items!inner(*)').eq('user_id', userId).eq('menu_items.day_of_week', dayOfWeek).eq('menu_items.meal_type', mealType),
    ]);

    // Filter menu items by day and meal type
    const relevantItems = menus.data?.flatMap(menu => 
      menu.menu_items?.filter((item: any) => 
        item.day_of_week === dayOfWeek && item.meal_type === mealType
      ) || []
    ) || [];

    const systemPrompt = `You are a nutrition expert. Analyze the meal image and provide detailed nutritional information and swap suggestions.

User Context:
- Goal: ${goal.data?.goal_type || 'general health'}
- Weight: ${profile.data?.weight || 'N/A'}kg, Height: ${profile.data?.height || 'N/A'}cm
- Allergies: ${allergies.data?.map(a => a.allergy_name).join(', ') || 'None'}
- Day: ${dayOfWeek}, Meal: ${mealType}

Available menu items for this day and meal type: ${JSON.stringify(relevantItems)}

Your task:
1. Identify the food items visible in the image
2. Estimate the total nutritional values for the meal
3. Evaluate if this meal aligns with the user's goal
4. Recommend 1-3 healthier swaps ONLY from the available menu items above
5. Explain why each swap is healthier based on nutritional differences`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: 'Analyze this meal and provide nutritional breakdown and swap recommendations.' },
              { type: 'image_url', image_url: { url: imageBase64 } }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_meal',
              description: 'Analyze meal nutrition and recommend swaps',
              parameters: {
                type: 'object',
                properties: {
                  detected_items: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of food items identified in the image'
                  },
                  calories: { type: 'number', description: 'Estimated total calories' },
                  protein: { type: 'number', description: 'Estimated protein in grams' },
                  carbs: { type: 'number', description: 'Estimated carbs in grams' },
                  fats: { type: 'number', description: 'Estimated fats in grams' },
                  fiber: { type: 'number', description: 'Estimated fiber in grams' },
                  goal_alignment: { 
                    type: 'string', 
                    description: 'Brief assessment of how well this meal aligns with user goal' 
                  },
                  swaps: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        from_item: { type: 'string', description: 'Current food item to swap' },
                        to_item: { type: 'string', description: 'Menu item name to swap to' },
                        reason: { type: 'string', description: 'Why this swap is healthier' },
                        nutritional_benefit: { type: 'string', description: 'Specific nutritional improvement' }
                      },
                      required: ['from_item', 'to_item', 'reason', 'nutritional_benefit']
                    },
                    description: 'List of recommended swaps from the available menu'
                  }
                },
                required: ['detected_items', 'calories', 'protein', 'carbs', 'fats', 'fiber', 'goal_alignment', 'swaps']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_meal' } }
      }),
    });

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No analysis returned from AI');
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Save analysis to database
    const { error: saveError } = await supabase.from('food_analyses').insert({
      user_id: userId,
      image_url: imageBase64,
      detected_items: analysis.detected_items,
      suggestions: {
        calories: analysis.calories,
        protein: analysis.protein,
        carbs: analysis.carbs,
        fats: analysis.fats,
        fiber: analysis.fiber,
        goal_alignment: analysis.goal_alignment,
        swaps: analysis.swaps,
        day_of_week: dayOfWeek,
        meal_type: mealType
      }
    });

    if (saveError) {
      console.error('Error saving analysis:', saveError);
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
