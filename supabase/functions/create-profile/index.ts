// supabase/functions/create-profile/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { profileData, role } = await req.json()

    // Create a Supabase client with the Auth context of the user that called the function.
    // This way your row-level-security (RLS) policies are applied.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Now we can get the session or user object
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error("User not found.");
    }

    // Create the Admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Prepare the final data object for insertion
    const dataToInsert = {
      id: user.id, // CRITICAL: Use the server-verified user ID
      role: role,
      ...profileData,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseAdmin
      .from('profiles')
      .insert(dataToInsert);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})