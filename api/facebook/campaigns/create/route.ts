import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookService } from '@/lib/services/facebook-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adAccountId, campaignData } = body;

    console.log('Campaign creation request:', { adAccountId, campaignData });

    if (!adAccountId || !campaignData) {
      return NextResponse.json(
        { error: 'Ad account ID and campaign data are required' },
        { status: 400 }
      );
    }

    // Validate required campaign fields
    if (!campaignData.name || !campaignData.objective) {
      return NextResponse.json(
        { error: 'Campaign name and objective are required' },
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

    // Format ad account ID with act_ prefix if needed
    const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    // Create campaign using FacebookService
    const facebookService = new FacebookService(supabase);
    const result = await facebookService.createCampaign(user.id, formattedAdAccountId, campaignData);

    if (!result.success) {
      // Handle Facebook API error codes
      let statusCode = 400;
      if (result.error?.includes('permission')) {
        statusCode = 403;
      } else if (result.error?.includes('not found')) {
        statusCode = 404;
      } else if (result.error?.includes('rate limit')) {
        statusCode = 429;
      }

      return NextResponse.json(
        { error: result.error },
        { status: statusCode }
      );
    }

    // Insert campaign into database
    const campaignDbData = {
      id: result.campaign.id,
      ad_account_id: adAccountId,
      name: campaignData.name,
      status: campaignData.status || 'PAUSED',
      objective: campaignData.objective,
      buying_type: campaignData.buying_type || 'AUCTION',
      special_ad_categories: campaignData.special_ad_categories || [],
      daily_budget: campaignData.daily_budget || null,
      lifetime_budget: campaignData.lifetime_budget || null,
      start_time: null,
      stop_time: null,
      created_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString()
    };

    const { error: dbError } = await supabase
      .from('facebook_campaigns')
      .insert(campaignDbData);

    if (dbError) {
      console.error('Error inserting campaign into database:', dbError);
      // Don't fail the request if database insertion fails
    }

    return NextResponse.json({
      success: true,
      campaign: result.campaign
    });

  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}