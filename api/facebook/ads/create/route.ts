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

    // Get the ad set ID from query params
    const searchParams = request.nextUrl.searchParams;
    const adSetId = searchParams.get('adSetId');

    if (!adSetId) {
      return NextResponse.json(
        { error: 'Ad set ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this ad set through campaign and ad account
    const { data: adSet, error: adSetError } = await supabase
      .from('facebook_ad_sets')
      .select('campaign_id')
      .eq('id', adSetId)
      .single();

    if (adSetError || !adSet) {
      return NextResponse.json(
        { error: 'Ad set not found' },
        { status: 404 }
      );
    }

    // Get the campaign to find the ad account
    const { data: campaign, error: campaignError } = await supabase
      .from('facebook_campaigns')
      .select('ad_account_id')
      .eq('id', adSet.campaign_id)
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
        { error: 'Access denied to this ad set' },
        { status: 403 }
      );
    }

    // Fetch ads for this ad set
    const { data: ads, error: adsError } = await supabase
      .from('facebook_ads')
      .select('*')
      .eq('ad_set_id', adSetId)
      .order('created_at', { ascending: false });

    if (adsError) {
      console.error('Error fetching ads:', adsError);
      return NextResponse.json(
        { error: `Failed to fetch ads: ${adsError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ads: ads || [] });
  } catch (error) {
    console.error('Error in ads API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 