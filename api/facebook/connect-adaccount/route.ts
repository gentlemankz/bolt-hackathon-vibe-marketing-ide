import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookService } from '@/lib/services/facebook-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adAccountId } = body;

    console.log('Ad account connection request:', { adAccountId });

    if (!adAccountId) {
      return NextResponse.json(
        { error: 'Ad account ID is required' },
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

    // Get Facebook access token
    const facebookService = new FacebookService(supabase);
    const accessToken = await facebookService.getAccessToken(user.id);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Facebook account not connected. Please connect your Facebook account first.' },
        { status: 401 }
      );
    }

    // Validate ad account ID format
    const cleanAdAccountId = adAccountId.replace('act_', '');
    if (!/^\d+$/.test(cleanAdAccountId)) {
      return NextResponse.json(
        { error: 'Invalid ad account ID format' },
        { status: 400 }
      );
    }

    // Connect the ad account using FacebookService
    console.log('Connecting ad account via FacebookService');
    await facebookService.connectAdAccount(user.id, adAccountId, accessToken);

    console.log('Ad account connected successfully:', adAccountId);

    return NextResponse.json({
      success: true,
      message: 'Ad account connected successfully'
    });

  } catch (error) {
    console.error('Error connecting ad account:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to connect ad account';
    
    // Handle specific error types
    let statusCode = 500;
    if (errorMessage.includes('not found')) {
      statusCode = 404;
    } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
      statusCode = 403;
    } else if (errorMessage.includes('rate limit')) {
      statusCode = 429;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}