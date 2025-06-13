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

    // Return hardcoded stock replicas
    const stockReplicas = [
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

    console.log(`Returning ${stockReplicas.length} stock replicas`);

    return NextResponse.json({
      replicas: stockReplicas,
      fallbackAvailable: true
    });

  } catch (error) {
    console.error('Error in Tavus stock replicas GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}