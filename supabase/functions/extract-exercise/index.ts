import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExerciseData {
  name: string
  primaryMuscleGroup: string
  secondaryMuscleGroups: string[]
  difficulty: string
  url: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if URL is from muscleandstrength.com
    if (!url.includes('muscleandstrength.com')) {
      return new Response(
        JSON.stringify({ error: 'Only muscleandstrength.com URLs are supported' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Fetching exercise data from: ${url}`)

    // Fetch the webpage
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch webpage: ${response.statusText}`)
    }

    const html = await response.text()
    
    // Extract exercise name from twitter:title meta tag
    const titleMatch = html.match(/<meta\s+name="twitter:title"\s+content="([^"]+)"\s*\/?>/)
    const exerciseName = titleMatch ? titleMatch[1] : ''

    // Extract muscle groups and difficulty from the HTML
    const exerciseData = extractExerciseDetails(html, exerciseName)

    console.log('Extracted exercise data:', exerciseData)

    return new Response(
      JSON.stringify(exerciseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error extracting exercise data:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function extractExerciseDetails(html: string, exerciseName: string): ExerciseData {
  // Muscle group mapping for consistency
  const muscleGroupMap: { [key: string]: string } = {
    'upper back': 'back',
    'lats': 'back',
    'biceps': 'biceps',
    'chest': 'chest',
    'shoulders': 'shoulders',
    'triceps': 'triceps',
    'legs': 'legs',
    'quadriceps': 'legs',
    'hamstrings': 'legs',
    'glutes': 'glutes',
    'calves': 'calves',
    'abs': 'abs',
    'forearms': 'forearms'
  }

  // Extract primary and secondary muscle groups
  let primaryMuscleGroup = 'chest' // default
  let secondaryMuscleGroups: string[] = []
  let difficulty = 'Beginner' // default

  // Look for muscle group information in various patterns
  const musclePatterns = [
    /Primary:\s*([^<\n]+)/i,
    /Target:\s*([^<\n]+)/i,
    /Main\s+Muscle:\s*([^<\n]+)/i,
    /Muscle\s+Group:\s*([^<\n]+)/i
  ]

  const secondaryPatterns = [
    /Secondary:\s*([^<\n]+)/i,
    /Synergists?:\s*([^<\n]+)/i,
    /Also\s+Works:\s*([^<\n]+)/i
  ]

  const difficultyPatterns = [
    /Difficulty:\s*(Beginner|Intermediate|Advanced)/i,
    /Level:\s*(Beginner|Intermediate|Advanced)/i
  ]

  // Extract primary muscle group
  for (const pattern of musclePatterns) {
    const match = html.match(pattern)
    if (match) {
      const muscleText = match[1].toLowerCase().trim()
      for (const [key, value] of Object.entries(muscleGroupMap)) {
        if (muscleText.includes(key)) {
          primaryMuscleGroup = value
          break
        }
      }
      break
    }
  }

  // Extract secondary muscle groups
  for (const pattern of secondaryPatterns) {
    const match = html.match(pattern)
    if (match) {
      const musclesText = match[1].toLowerCase()
      for (const [key, value] of Object.entries(muscleGroupMap)) {
        if (musclesText.includes(key) && value !== primaryMuscleGroup) {
          if (!secondaryMuscleGroups.includes(value)) {
            secondaryMuscleGroups.push(value)
          }
        }
      }
      break
    }
  }

  // Extract difficulty
  for (const pattern of difficultyPatterns) {
    const match = html.match(pattern)
    if (match) {
      difficulty = match[1]
      break
    }
  }

  // Fallback: analyze exercise name for muscle groups
  if (!secondaryMuscleGroups.length) {
    const nameText = exerciseName.toLowerCase()
    if (nameText.includes('row') || nameText.includes('pull')) {
      primaryMuscleGroup = 'back'
      secondaryMuscleGroups = ['biceps']
    } else if (nameText.includes('press') || nameText.includes('push')) {
      primaryMuscleGroup = 'chest'
      secondaryMuscleGroups = ['shoulders', 'triceps']
    } else if (nameText.includes('curl')) {
      primaryMuscleGroup = 'biceps'
    } else if (nameText.includes('squat')) {
      primaryMuscleGroup = 'legs'
      secondaryMuscleGroups = ['glutes']
    }
  }

  return {
    name: exerciseName,
    primaryMuscleGroup,
    secondaryMuscleGroups,
    difficulty,
    url: ''
  }
}