import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PrayerTimesResponse {
  data: {
    timings: {
      Fajr: string;
      Sunrise: string;
      Dhuhr: string;
      Asr: string;
      Sunset: string;
      Maghrib: string;
      Isha: string;
    };
    date: {
      readable: string;
      gregorian: {
        date: string;
      };
    };
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get request parameters (from body or URL)
    let body: any = {};
    try {
      if (req.method !== 'GET' && req.headers.get('content-type')?.includes('application/json')) {
        body = await req.json();
      }
    } catch (_) {
      body = {};
    }

    const url = new URL(req.url);
    const city = body.city || url.searchParams.get('city') || 'Ramallah';
    const country = body.country || url.searchParams.get('country') || 'Palestine';
    const method = body.method || url.searchParams.get('method') || '4'; // Umm al-Qura
    const latitude = body.latitude || url.searchParams.get('latitude');
    const longitude = body.longitude || url.searchParams.get('longitude');

    console.log(`Fetching prayer times with method ${method}. City/Country: ${city}, ${country}. Lat/Lon: ${latitude}, ${longitude}`);

    // Build Aladhan API URL based on available params
    let aladhanUrl = '';
    if (latitude && longitude) {
      aladhanUrl = `https://api.aladhan.com/v1/timings?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&method=${method}`;
    } else {
      aladhanUrl = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
    }
    console.log(`API URL: ${aladhanUrl}`);

    const response = await fetch(aladhanUrl);
    if (!response.ok) {
      throw new Error(`Aladhan API error: ${response.status}`);
    }

    const data: PrayerTimesResponse = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));

    if (!data.data || !data.data.timings) {
      throw new Error('Invalid response from Aladhan API');
    }

    const timings = data.data.timings;
    const gregDate = data.data.date.gregorian.date; // format DD-MM-YYYY

    // Convert DD-MM-YYYY to YYYY-MM-DD for Postgres date column
    const [dd, mm, yyyy] = gregDate.split('-');
    const isoDate = `${yyyy}-${mm}-${dd}`;

    // Convert 24-hour format times to proper format for database
    const formatTime = (timeStr: string) => {
      // Remove timezone info and get only HH:MM
      return timeStr.split(' ')[0].substring(0, 5);
    };

    const prayerData = {
      date: isoDate,
      fajr: formatTime(timings.Fajr),
      dhuhr: formatTime(timings.Dhuhr),
      asr: formatTime(timings.Asr),
      maghrib: formatTime(timings.Maghrib),
      isha: formatTime(timings.Isha),
      sunrise: formatTime(timings.Sunrise),
      sunset: formatTime(timings.Sunset),
      city,
      country,
    };

    console.log('Formatted prayer data:', prayerData);

    // Upsert prayer times into database
    const { data: insertedData, error } = await supabaseClient
      .from('prayer_times')
      .upsert(prayerData, { 
        onConflict: 'date',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('Successfully stored prayer times:', insertedData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: insertedData[0],
        message: `Prayer times updated for ${insertedData[0]?.date}` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in fetch-prayer-times function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});