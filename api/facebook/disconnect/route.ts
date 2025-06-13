import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookService } from '@/lib/services/facebook-service';

export async function POST(request: NextRequest) {
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

    console.log('Disconnecting Facebook account for user:', user.id);

    // Use FacebookService to handle disconnection
    const facebookService = new FacebookService(supabase);
    const result = await facebookService.disconnectAccount(user.id);

    if (!result.success) {
      console.error('Failed to disconnect Facebook account:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    console.log('Facebook account disconnected successfully for user:', user.id);

    return NextResponse.json({
      success: true,
      message: 'Facebook account disconnected successfully'
    });

  } catch (error) {
    console.error('Error in Facebook disconnect route:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect Facebook account';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}