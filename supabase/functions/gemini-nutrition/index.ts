import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { foodName } = await req.json();
    
    if (!foodName) {
      return new Response(JSON.stringify({ error: 'Food name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Searching nutrition for:', foodName);

    const prompt = `Please provide detailed nutritional information for "${foodName}" per 100g serving. 
    Return the data in this exact JSON format only, no additional text:
    {
      "name": "food name in English",
      "serving_size": "100",
      "serving_unit": "g",
      "calories_per_serving": number,
      "protein_per_serving": number,
      "carbs_per_serving": number,
      "fat_per_serving": number,
      "fiber_per_serving": number,
      "sugar_per_serving": number,
      "sodium_per_serving": number
    }
    
    Use standard nutritional values from USDA or similar reliable sources. All values should be numbers (not strings).
    If the food is not recognized, return null.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini response:', JSON.stringify(data, null, 2));
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Invalid response structure from Gemini');
      return new Response(JSON.stringify({ error: 'Invalid response from AI service' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    console.log('Generated text:', generatedText);
    
    // Clean up the response to extract JSON
    let cleanedText = generatedText.trim();
    
    // Remove markdown code blocks if present
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Try to parse the JSON
    let nutritionData;
    try {
      nutritionData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Cleaned text:', cleanedText);
      
      // If JSON parsing fails, return null (food not found)
      return new Response(JSON.stringify({ nutritionData: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Validate the structure
    if (!nutritionData || nutritionData === null) {
      return new Response(JSON.stringify({ nutritionData: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Ensure all required fields are present and are numbers
    const requiredFields = ['calories_per_serving', 'protein_per_serving', 'carbs_per_serving', 'fat_per_serving', 'fiber_per_serving', 'sugar_per_serving', 'sodium_per_serving'];
    for (const field of requiredFields) {
      if (typeof nutritionData[field] !== 'number') {
        nutritionData[field] = parseFloat(nutritionData[field]) || 0;
      }
    }
    
    console.log('Final nutrition data:', nutritionData);

    return new Response(JSON.stringify({ nutritionData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gemini-nutrition function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get nutrition information',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});