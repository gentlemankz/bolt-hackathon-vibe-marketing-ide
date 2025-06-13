import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookService } from '@/lib/services/facebook-service';
import { FacebookMetricsService } from '@/lib/services/facebook-metrics-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adAccountId } = body;

    console.log('Metrics sync request:', { adAccountId });

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

    // Verify user owns this ad account
    const { data: adAccount, error: adAccountError } = await supabase
      .from('facebook_ad_accounts')
      .select('id, name')
      .eq('id', adAccountId)
      .eq('user_id', user.id)
      .single();

    if (adAccountError || !adAccount) {
      return NextResponse.json(
        { error: 'Ad account not found or access denied' },
        { status: 403 }
      );
    }

    // Get Facebook access token
    const facebookService = new FacebookService(supabase);
    const accessToken = await facebookService.getAccessToken(user.id);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Facebook account not connected' },
        { status: 401 }
      );
    }

    // Check for ad permissions
    const { data: tokenData } = await supabase
      .from('facebook_tokens')
      .select('has_ad_permissions')
      .eq('user_id', user.id)
      .single();

    const hasAdPermissions = tokenData?.has_ad_permissions ?? true;

    // Initialize metrics service and start sync
    const metricsService = new FacebookMetricsService(supabase);
    
    console.log('Starting metrics sync for ad account:', adAccountId);
    const jobId = await metricsService.syncAllMetrics(user.id, adAccountId, accessToken);

    console.log('Metrics sync job started:', jobId);

    const response = {
      success: true,
      job_id: jobId,
      message: 'Metrics sync started successfully'
    };

    // Add warning if permissions are missing
    if (!hasAdPermissions) {
      response.warning = 'Your Facebook account may be missing ad permissions. Some metrics data might not be available.';
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error starting metrics sync:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to start metrics sync';
    
    // Handle specific error types
    let statusCode = 500;
    if (errorMessage.includes('permission') || errorMessage.includes('access')) {
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