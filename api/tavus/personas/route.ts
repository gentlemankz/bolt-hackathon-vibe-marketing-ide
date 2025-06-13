import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TavusService } from '@/lib/services/tavus-service';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tavusService = new TavusService(supabase);
    const personas = await tavusService.listPersonas(user.id);

    return NextResponse.json({ personas });
  } catch (error) {
    console.error('Error fetching personas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch personas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { personaName, systemPrompt, context } = body;

    if (!personaName || !systemPrompt || !context) {
      return NextResponse.json(
        { error: 'Missing required fields: personaName, systemPrompt, context' },
        { status: 400 }
      );
    }

    const tavusService = new TavusService(supabase);
    const persona = await tavusService.createPersona(personaName, systemPrompt, context, user.id);

    return NextResponse.json({ persona });
  } catch (error) {
    console.error('Error creating persona:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create persona' },
      { status: 500 }
    );
  }
} 