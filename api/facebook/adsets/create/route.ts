import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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

    // Get the campaign ID from query params
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this campaign via ad account
    const { data: campaign, error: campaignError } = await supabase
      .from('facebook_campaigns')
      .select('ad_account_id')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Check if user has access to the related ad account
    const { data: adAccount, error: adAccountError } = await supabase
      .from('facebook_ad_accounts')
      .select('id')
      .eq('id', campaign.ad_account_id)
      .eq('user_id', user.id)
      .single();

    if (adAccountError || !adAccount) {
      return NextResponse.json(
        { error: 'Access denied to this campaign' },
        { status: 403 }
      );
    }

    // Fetch ad sets for this campaign
    const { data: adSets, error: adSetsError } = await supabase
      .from('facebook_ad_sets')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (adSetsError) {
      console.error('Error fetching ad sets:', adSetsError);
      return NextResponse.json(
        { error: `Failed to fetch ad sets: ${adSetsError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ adSets: adSets || [] });
  } catch (error) {
    console.error('Error in ad sets API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 