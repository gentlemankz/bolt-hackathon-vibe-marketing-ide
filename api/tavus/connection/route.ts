import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

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

    // Get Tavus connection for user
    const { data: connection, error: connectionError } = await supabase
      .from('tavus_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connectionError) {
      if (connectionError.code === 'PGRST116') {
        // No connection found
        return NextResponse.json(
          { error: 'No Tavus connection found' },
          { status: 404 }
        );
      }
      
      console.error('Error fetching Tavus connection:', connectionError);
      return NextResponse.json(
        { error: 'Failed to fetch Tavus connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      connection
    });

  } catch (error) {
    console.error('Error in Tavus connection GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_key } = body;

    if (!api_key || !api_key.trim()) {
      return NextResponse.json(
        { error: 'API key is required' },
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

    // Validate API key by making a test request to Tavus API
    try {
      const testResponse = await fetch('https://tavusapi.com/v2/replicas?replica_type=user&verbose=true', {
        headers: {
          'x-api-key': api_key.trim(),
          'Content-Type': 'application/json'
        }
      });

      if (!testResponse.ok) {
        if (testResponse.status === 401) {
          return NextResponse.json(
            { error: 'Invalid API key. Please check your Tavus API key and try again.' },
            { status: 400 }
          );
        } else if (testResponse.status === 403) {
          return NextResponse.json(
            { error: 'API key does not have sufficient permissions. Please check your Tavus account settings.' },
            { status: 400 }
          );
        } else if (testResponse.status === 429) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.' },
            { status: 400 }
          );
        } else {
          return NextResponse.json(
            { error: 'Failed to validate API key. Please try again.' },
            { status: 400 }
          );
        }
      }
    } catch (validationError) {
      console.error('Error validating Tavus API key:', validationError);
      return NextResponse.json(
        { error: 'Failed to validate API key. Please check your connection and try again.' },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS for upsert operation
    const serviceClient = createServiceClient();
    
    // Upsert Tavus connection
    const connectionData = {
      user_id: user.id,
      api_key: api_key.trim(),
      is_connected: true,
      connection_status: 'connected',
      last_connected_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: connection, error: connectionError } = await serviceClient
      .from('tavus_connections')
      .upsert(connectionData, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (connectionError) {
      console.error('Error saving Tavus connection:', connectionError);
      return NextResponse.json(
        { error: 'Failed to save Tavus connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      connection
    });

  } catch (error) {
    console.error('Error in Tavus connection POST route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Use service client to bypass RLS for cleanup operations
    const serviceClient = createServiceClient();

    console.log('Starting Tavus data cleanup for user:', user.id);

    // Delete in specific order to handle foreign key constraints
    
    // 1. Delete videos
    const { error: videosError } = await serviceClient
      .from('tavus_videos')
      .delete()
      .eq('user_id', user.id);

    if (videosError) {
      console.error('Error deleting Tavus videos:', videosError);
    }

    // 2. Delete personas
    const { error: personasError } = await serviceClient
      .from('tavus_personas')
      .delete()
      .eq('user_id', user.id);

    if (personasError) {
      console.error('Error deleting Tavus personas:', personasError);
    }

    // 3. Delete replicas
    const { error: replicasError } = await serviceClient
      .from('tavus_replicas')
      .delete()
      .eq('user_id', user.id);

    if (replicasError) {
      console.error('Error deleting Tavus replicas:', replicasError);
    }

    // 4. Delete connection
    const { error: connectionError } = await serviceClient
      .from('tavus_connections')
      .delete()
      .eq('user_id', user.id);

    if (connectionError) {
      console.error('Error deleting Tavus connection:', connectionError);
      return NextResponse.json(
        { error: 'Failed to delete Tavus connection' },
        { status: 500 }
      );
    }

    console.log('Tavus data cleanup completed for user:', user.id);

    return NextResponse.json({
      success: true,
      message: 'Tavus account disconnected successfully'
    });

  } catch (error) {
    console.error('Error in Tavus connection DELETE route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}