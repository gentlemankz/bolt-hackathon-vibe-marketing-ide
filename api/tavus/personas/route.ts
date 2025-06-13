import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's personas
    const { data: personas, error: personasError } = await supabase
      .from('tavus_personas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (personasError) {
      console.error('Error fetching Tavus personas:', personasError);
      return NextResponse.json(
        { error: 'Failed to fetch personas' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      personas: personas || []
    });

  } catch (error) {
    console.error('Error in Tavus personas GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { persona_name, system_prompt, context } = body;

    // Validate required fields
    if (!persona_name || !persona_name.trim()) {
      return NextResponse.json(
        { error: 'Persona name is required' },
        { status: 400 }
      );
    }

    if (!system_prompt || !system_prompt.trim()) {
      return NextResponse.json(
        { error: 'System prompt is required' },
        { status: 400 }
      );
    }

    if (!context || !context.trim()) {
      return NextResponse.json(
        { error: 'Context is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Create persona in database
    const personaData = {
      persona_id: `persona_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      persona_name: persona_name.trim(),
      system_prompt: system_prompt.trim(),
      context: context.trim(),
      user_id: user.id,
      created_at: new Date().toISOString()
    };

    const { data: persona, error: personaError } = await supabase
      .from('tavus_personas')
      .insert(personaData)
      .select()
      .single();

    if (personaError) {
      console.error('Error creating Tavus persona:', personaError);
      return NextResponse.json(
        { error: 'Failed to create persona' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      persona
    });

  } catch (error) {
    console.error('Error in Tavus personas POST route:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}