import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
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

    // Verify user has access to this campaign through ad account ownership
    const { data: campaign, error: campaignError } = await supabase
      .from('facebook_campaigns')
      .select(`
        id,
        facebook_ad_accounts!inner(user_id)
      `)
      .eq('id', campaignId)
      .eq('facebook_ad_accounts.user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 403 }
      );
    }

    // Fetch ad sets for the campaign
    const { data: adSets, error: adSetsError } = await supabase
      .from('facebook_ad_sets')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (adSetsError) {
      console.error('Error fetching ad sets:', adSetsError);
      return NextResponse.json(
        { error: 'Failed to fetch ad sets' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      adSets: adSets || []
    });

  } catch (error) {
    console.error('Error in ad sets route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}