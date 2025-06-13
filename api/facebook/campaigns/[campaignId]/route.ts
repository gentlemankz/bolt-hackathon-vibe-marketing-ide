import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const { campaignId } = params;

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

    // Fetch campaign with ad account ownership verification
    const { data: campaign, error: campaignError } = await supabase
      .from('facebook_campaigns')
      .select(`
        *,
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

    // Detect CBO (Campaign Budget Optimization)
    const isCBOEnabled = !!(campaign.daily_budget || campaign.lifetime_budget);

    return NextResponse.json({
      campaign: {
        ...campaign,
        is_cbo_enabled: isCBOEnabled
      }
    });

  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}