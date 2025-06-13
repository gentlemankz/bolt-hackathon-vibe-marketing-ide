import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookService } from '@/lib/services/facebook-service';

export async function POST(request: NextRequest) {
  try {
    // Get the user session
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    const { businessId } = body;
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }
    
    // Get the Facebook access token
    const facebookService = new FacebookService(supabase);
    const accessToken = await facebookService.getAccessToken(session.user.id);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Facebook access token not found or expired' },
        { status: 401 }
      );
    }
    
    // Connect the business account
    // TODO: Implement connectBusinessAccount method in FacebookService
    // await facebookService.connectBusinessAccount(
    //   session.user.id,
    //   businessId,
    //   accessToken
    // );
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error connecting Facebook business account:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 