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
    
    // Use service role key to bypass RLS when saving analysis
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    // Get user's allergens list
    const userAllergens = allergies.data?.map(a => a.allergy_name.toLowerCase()) || [];
    
    const systemPrompt = `You are a personalized nutrition expert analyzing meals for a user with specific health goals and dietary restrictions.

**USER PROFILE:**
- PRIMARY GOAL: ${goal.data?.goal_type || 'general health'}
- Weight: ${profile.data?.weight || 'N/A'}kg, Height: ${profile.data?.height || 'N/A'}cm
- Gender: ${profile.data?.gender || 'N/A'}
- ALLERGIES (CRITICAL - NEVER recommend items containing these): ${userAllergens.length > 0 ? userAllergens.join(', ') : 'None'}

**AVAILABLE MENU ITEMS for ${dayOfWeek} ${mealType}:**
${relevantItems.length > 0 ? relevantItems.map((item, idx) => 
  `${idx + 1}. "${item.name}" - ${item.calories || 0} kcal, Protein: ${item.protein || 0}g, Carbs: ${item.carbs || 0}g, Fats: ${item.fats || 0}g, Fiber: ${item.fiber || 0}g`
).join('\n') : 'No menu items available for this meal'}

**YOUR TASK:**
1. Analyze the meal image and identify all food items
2. Estimate total nutritional values (calories, protein, carbs, fats, fiber)
3. Evaluate alignment with user's PRIMARY GOAL: "${goal.data?.goal_type || 'general health'}"
4. **MANDATORY**: Recommend 2-3 healthier swap suggestions from the available menu items above that:
   - Better align with the user's "${goal.data?.goal_type || 'general health'}" goal
   - DO NOT contain any of the user's allergens: ${userAllergens.length > 0 ? userAllergens.join(', ') : 'none'}
   - Offer clear nutritional benefits (e.g., lower calories for weight loss, higher protein for muscle gain)
   - Use the EXACT name from the menu list above

**SWAP REQUIREMENTS:**
- If menu items are available above, you MUST provide at least 2 swap suggestions
- Each swap must reference a detected item from the image and suggest a healthier menu alternative
- Explain why each swap helps achieve the "${goal.data?.goal_type || 'general health'}" goal
- State the specific nutritional improvement (e.g., "Saves 150 calories", "Adds 10g protein")

**PERSONALIZATION RULES:**
- For "Weight Loss": Prioritize lower calorie, high fiber options
- For "Muscle Gain": Prioritize high protein options
- For "General Health": Balance all macronutrients
- NEVER suggest items containing: ${userAllergens.length > 0 ? userAllergens.join(', ') : 'no allergens listed'}`;

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
    console.log('AI Response:', JSON.stringify(data, null, 2));
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error('No tool call in response');
      throw new Error('No analysis returned from AI');
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log('Parsed analysis:', JSON.stringify(analysis, null, 2));
    console.log('Number of swaps:', analysis.swaps?.length || 0);

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
