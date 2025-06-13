import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// Test Tavus API key validity
async function testTavusApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch('https://tavusapi.com/v2/replicas', {
      headers: {
        'x-api-key': apiKey,
      },
    });

    if (response.ok) {
      return { valid: true };
    } else if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    } else if (response.status === 403) {
      return { valid: false, error: 'API key lacks required permissions' };
    } else {
      return { valid: false, error: 'Unable to verify API key' };
    }
  } catch {
    return { valid: false, error: 'Network error while testing API key' };
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service client to bypass RLS while validating user ownership
    const { data: connection } = await serviceClient
      .from('tavus_connections')
      .select('id, is_connected, connection_status, error_message, last_connected_at, created_at')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({ connection: connection || null });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Test the API key
    const test = await testTavusApiKey(apiKey);
    if (!test.valid) {
      return NextResponse.json({ error: test.error }, { status: 400 });
    }

    // Use service client for database operations
    const { data: connection } = await serviceClient
      .from('tavus_connections')
      .upsert({
        user_id: user.id,
        api_key: apiKey,
        is_connected: true,
        connection_status: 'connected',
        error_message: null,
        last_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    return NextResponse.json({ 
      connection: {
        id: connection.id,
        is_connected: connection.is_connected,
        connection_status: connection.connection_status,
        error_message: connection.error_message,
        last_connected_at: connection.last_connected_at,
        created_at: connection.created_at,
      }
    });
  } catch {
    return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all user's Tavus data from database (similar to Facebook disconnect)
    
    // 1. Delete conversations
    const { error: conversationsError } = await serviceClient
      .from('tavus_conversations')
      .delete()
      .eq('user_id', user.id);
    
    if (conversationsError) {
      console.error('Error deleting conversations:', conversationsError);
    }
    
    // 2. Delete videos
    const { error: videosError } = await serviceClient
      .from('tavus_videos')
      .delete()
      .eq('user_id', user.id);
      
    if (videosError) {
      console.error('Error deleting videos:', videosError);
    }
    
    // 3. Delete personas
    const { error: personasError } = await serviceClient
      .from('tavus_personas')
      .delete()
      .eq('user_id', user.id);
      
    if (personasError) {
      console.error('Error deleting personas:', personasError);
    }
    
    // 4. Delete replicas
    const { error: replicasError } = await serviceClient
      .from('tavus_replicas')
      .delete()
      .eq('user_id', user.id);
      
    if (replicasError) {
      console.error('Error deleting replicas:', replicasError);
    }
    
    // 5. Delete lead nurturing files
    const { error: filesError } = await serviceClient
      .from('lead_nurturing_files')
      .delete()
      .eq('user_id', user.id);
      
    if (filesError) {
      console.error('Error deleting lead nurturing files:', filesError);
    }
    
    // 6. Delete connection (should be done last)
    const { error: connectionError } = await serviceClient
      .from('tavus_connections')
      .delete()
      .eq('user_id', user.id);
      
    if (connectionError) {
      console.error('Error deleting connection:', connectionError);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
} 