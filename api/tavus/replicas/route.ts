import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStock = searchParams.get('include_stock') === 'true';

    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let userReplicas = [];
    let stockReplicas = [];

    // Get user's replicas
    try {
      const { data: replicas, error: replicasError } = await supabase
        .from('tavus_replicas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (replicasError) {
        // Handle specific database errors
        if (replicasError.code === '42501') {
          console.error('Database permission error for tavus_replicas table:', replicasError);
          return NextResponse.json(
            { error: 'Database setup incomplete. Please ensure the tavus_replicas table exists and has proper permissions.' },
            { status: 500 }
          );
        } else if (replicasError.code === '42P01') {
          console.error('Table does not exist:', replicasError);
          return NextResponse.json(
            { error: 'Database table missing. Please ensure the tavus_replicas table is created.' },
            { status: 500 }
          );
        }
        
        console.error('Error fetching user replicas:', replicasError);
        
        // Fallback to stock replicas only
        if (includeStock) {
          console.log('Falling back to stock replicas only due to database error');
          stockReplicas = getHardcodedStockReplicas();
          
          return NextResponse.json({
            replicas: stockReplicas,
            warning: 'Could not load user replicas due to database error'
          });
        }
        
        return NextResponse.json(
          { error: 'Failed to fetch replicas' },
          { status: 500 }
        );
      }

      userReplicas = replicas || [];
    } catch (dbError) {
      console.error('Database error fetching replicas:', dbError);
      
      // Fallback to stock replicas if database fails
      if (includeStock) {
        stockReplicas = getHardcodedStockReplicas();
        
        return NextResponse.json({
          replicas: stockReplicas,
          warning: 'Database unavailable, showing stock replicas only'
        });
      }
      
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    // Include stock replicas if requested
    if (includeStock) {
      stockReplicas = getHardcodedStockReplicas();
    }

    const allReplicas = [...userReplicas, ...stockReplicas];

    return NextResponse.json({
      replicas: allReplicas,
      userReplicas,
      stockReplicas,
      fallbackAvailable: stockReplicas.length > 0
    });

  } catch (error) {
    console.error('Error in Tavus replicas GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { replica_name, train_video_url } = body;

    // Validate required fields
    if (!replica_name || !replica_name.trim()) {
      return NextResponse.json(
        { error: 'Replica name is required' },
        { status: 400 }
      );
    }

    if (!train_video_url || !train_video_url.trim()) {
      return NextResponse.json(
        { error: 'Training video URL is required' },
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

    // Create replica in database
    const replicaData = {
      replica_id: `replica_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      replica_name: replica_name.trim(),
      status: 'training',
      training_progress: '0%',
      user_id: user.id,
      created_at: new Date().toISOString()
    };

    const { data: replica, error: replicaError } = await supabase
      .from('tavus_replicas')
      .insert(replicaData)
      .select()
      .single();

    if (replicaError) {
      console.error('Error creating Tavus replica:', replicaError);
      return NextResponse.json(
        { error: 'Failed to create replica' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      replica
    });

  } catch (error) {
    console.error('Error in Tavus replicas POST route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function for hardcoded stock replicas
function getHardcodedStockReplicas() {
  return [
    {
      replica_id: 'r1fbfc941b',
      replica_name: 'Nathan - Professional Male',
      status: 'ready',
      training_progress: '100%',
      created_at: new Date().toISOString(),
      user_id: 'system',
      is_stock: true,
      avatar_url: 'https://tavusapi.com/avatars/nathan.jpg',
    },
    {
      replica_id: 'r4c41453d2',
      replica_name: 'Anna - Business Female',
      status: 'ready',
      training_progress: '100%',
      created_at: new Date().toISOString(),
      user_id: 'system',
      is_stock: true,
      avatar_url: 'https://tavusapi.com/avatars/anna.jpg',
    },
    {
      replica_id: 'r94e875b92',
      replica_name: 'Marcus - Corporate Professional',
      status: 'ready',
      training_progress: '100%',
      created_at: new Date().toISOString(),
      user_id: 'system',
      is_stock: true,
      avatar_url: 'https://tavusapi.com/avatars/marcus.jpg',
    },
    {
      replica_id: 'r68920c31a',
      replica_name: 'Sarah - Marketing Specialist',
      status: 'ready',
      training_progress: '100%',
      created_at: new Date().toISOString(),
      user_id: 'system',
      is_stock: true,
      avatar_url: 'https://tavusapi.com/avatars/sarah.jpg',
    },
    {
      replica_id: 'r5e3f7a9c1',
      replica_name: 'James - Technical Expert',
      status: 'ready',
      training_progress: '100%',
      created_at: new Date().toISOString(),
      user_id: 'system',
      is_stock: true,
      avatar_url: 'https://tavusapi.com/avatars/james.jpg',
    },
    {
      replica_id: 'r2d8b4f6e7',
      replica_name: 'Emily - Customer Support',
      status: 'ready',
      training_progress: '100%',
      created_at: new Date().toISOString(),
      user_id: 'system',
      is_stock: true,
      avatar_url: 'https://tavusapi.com/avatars/emily.jpg',
    },
  ];
}