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

    const systemPrompt = `You are a nutrition expert. Analyze the meal image and provide swap suggestions based on:
- Goal: ${goal.data?.goal_type || 'general health'}
- Weight: ${profile.data?.weight || 'N/A'}kg, Height: ${profile.data?.height || 'N/A'}cm
- Allergies: ${allergies.data?.map(a => a.allergy_name).join(', ') || 'None'}
- Day: ${dayOfWeek}, Meal: ${mealType}
- Available menu items for this meal: ${JSON.stringify(relevantItems)}

Analyze the food in the image and suggest healthier swaps ONLY from the available menu items listed above that better align with the user's goals. Be specific about which items to swap and why.`;

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
              { type: 'text', text: 'Analyze this meal and suggest swaps from my menu.' },
              { type: 'image_url', image_url: { url: imageBase64 } }
            ]
          }
        ],
      }),
    });

    const data = await response.json();
    const suggestions = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ suggestions }), {
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
