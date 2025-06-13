import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookService } from '@/lib/services/facebook-service';

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the ad account ID from the request body
    const body = await request.json();
    const { adAccountId } = body;

    if (!adAccountId) {
      return NextResponse.json(
        { error: 'Ad account ID is required' },
        { status: 400 }
      );
    }

    // Get access token from database
    const facebookService = new FacebookService(supabase);
    const accessToken = await facebookService.getAccessToken(user.id);

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Facebook access token not found. Please reconnect your Facebook account.' },
        { status: 400 }
      );
    }

    // Connect the ad account
    await facebookService.connectAdAccount(user.id, adAccountId, accessToken);

    // Return success response
    return NextResponse.json(
      { message: 'Ad account connected successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error connecting Facebook ad account:', error);
    
    // Detailed error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 