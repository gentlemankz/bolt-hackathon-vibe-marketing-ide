import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Replica ID is required' },
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

    // Get replica by ID
    const { data: replica, error: replicaError } = await supabase
      .from('tavus_replicas')
      .select('*')
      .eq('replica_id', id)
      .eq('user_id', user.id)
      .single();

    if (replicaError) {
      if (replicaError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Replica not found' },
          { status: 404 }
        );
      }
      
      console.error('Error fetching Tavus replica:', replicaError);
      return NextResponse.json(
        { error: 'Failed to fetch replica' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      replica
    });

  } catch (error) {
    console.error('Error in Tavus replica GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Replica ID is required' },
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

    // Delete replica
    const { error: deleteError } = await supabase
      .from('tavus_replicas')
      .delete()
      .eq('replica_id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting Tavus replica:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete replica' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Replica deleted successfully'
    });

  } catch (error) {
    console.error('Error in Tavus replica DELETE route:', error);
    
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