import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookService } from '@/lib/services/facebook-service';
import { FacebookMetricsService } from '@/lib/services/facebook-metrics-service';

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

    // Check if token has ad permissions
    const { data: tokenData } = await supabase
      .from('facebook_tokens')
      .select('has_ad_permissions')
      .eq('user_id', user.id)
      .single();
    
    const hasAdPermissions = tokenData?.has_ad_permissions || false;

    // Verify user has access to this ad account
    const { data: adAccount, error: adAccountError } = await supabase
      .from('facebook_ad_accounts')
      .select('id')
      .eq('id', adAccountId)
      .eq('user_id', user.id)
      .single();

    if (adAccountError || !adAccount) {
      return NextResponse.json(
        { error: 'Ad account not found or access denied' },
        { status: 404 }
      );
    }

    // Create metrics service and start syncing
    const metricsService = new FacebookMetricsService(supabase);
    const jobId = await metricsService.syncAllMetrics(user.id, adAccountId, accessToken);

    // Return job ID for tracking along with permission status
    return NextResponse.json({ 
      jobId,
      hasAdPermissions,
      warning: !hasAdPermissions ? 
        'Your Facebook token lacks required ad permissions. Some metrics may be missing or inaccurate. Please reconnect your Facebook account with ads_management and ads_read permissions.' : 
        undefined
    });
  } catch (error) {
    console.error('Error syncing Facebook metrics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 