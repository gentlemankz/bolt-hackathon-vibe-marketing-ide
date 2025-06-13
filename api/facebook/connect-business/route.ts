import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookService } from '@/lib/services/facebook-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId } = body;

    console.log('Business connection request:', { businessId });

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
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

    // Validate business ID format
    if (!/^\d+$/.test(businessId)) {
      return NextResponse.json(
        { error: 'Invalid business ID format' },
        { status: 400 }
      );
    }

    // TODO: Implement business account connection logic
    // This would involve:
    // 1. Validating access to the business account
    // 2. Fetching business account details from Facebook API
    // 3. Storing business account information in database
    // 4. Setting up permissions and access levels
    
    console.log('Business account connection not yet implemented');

    return NextResponse.json({
      success: false,
      message: 'Business account connection is not yet implemented',
      todo: 'Implement business account connection logic'
    }, { status: 501 });

  } catch (error) {
    console.error('Error connecting business account:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to connect business account';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}