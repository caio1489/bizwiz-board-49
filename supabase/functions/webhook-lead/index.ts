import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LeadWebhookData {
  name: string;
  email: string;
  phone: string;
  company?: string;
  value?: number;
  source: string;
  tags?: string[];
  notes?: string;
  assignedTo?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Webhook received:', req.method, req.url);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the request body
    const body = await req.json();
    console.log('Request body:', body);

    // Validate required fields
    const { name, email, phone, company, value, source, tags, notes, assignedTo } = body as LeadWebhookData;

    if (!name || !email || !phone || !source) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          required: ['name', 'email', 'phone', 'source'] 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create lead object
    const leadData = {
      id: crypto.randomUUID(),
      name,
      email,
      phone,
      company: company || '',
      value: value || 0,
      status: 'new' as const,
      tags: tags || [],
      assigned_to: assignedTo || 'webhook-user', // Default assignment
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: notes || '',
      source,
      user_id: assignedTo || 'webhook-user' // Add user_id field
    };

    console.log('Lead data created:', leadData);

    // Save to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save to leads table
    const { data, error } = await supabase
      .from('leads')
      .insert([leadData]);

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save lead', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead received successfully',
        leadId: leadData.id,
        leadData: leadData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});