import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookService } from '@/lib/services/facebook-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, adSetData } = body;

    console.log('Ad set creation request:', { campaignId, adSetData });

    if (!campaignId || !adSetData) {
      return NextResponse.json(
        { error: 'Campaign ID and ad set data are required' },
        { status: 400 }
      );
    }

    // Validate required ad set fields
    if (!adSetData.name || !adSetData.optimization_goal || !adSetData.billing_event) {
      return NextResponse.json(
        { error: 'Ad set name, optimization goal, and billing event are required' },
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

    // Get campaign and check for CBO
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

    // Check for Campaign Budget Optimization (CBO)
    const isCBOEnabled = !!(campaign.daily_budget || campaign.lifetime_budget);
    
    if (isCBOEnabled && (adSetData.daily_budget || adSetData.lifetime_budget)) {
      return NextResponse.json(
        { error: 'Cannot set ad set budget when Campaign Budget Optimization is enabled' },
        { status: 400 }
      );
    }

    if (!isCBOEnabled && !adSetData.daily_budget && !adSetData.lifetime_budget) {
      return NextResponse.json(
        { error: 'Ad set budget is required when Campaign Budget Optimization is not enabled' },
        { status: 400 }
      );
    }

    // Validate optimization goal and billing event combination
    const validCombinations = {
      'REACH': ['IMPRESSIONS'],
      'IMPRESSIONS': ['IMPRESSIONS'],
      'LINK_CLICKS': ['LINK_CLICKS', 'IMPRESSIONS'],
      'POST_ENGAGEMENT': ['POST_ENGAGEMENT', 'IMPRESSIONS'],
      'PAGE_LIKES': ['PAGE_LIKES', 'IMPRESSIONS'],
      'APP_INSTALLS': ['APP_INSTALLS', 'IMPRESSIONS'],
      'LEAD_GENERATION': ['IMPRESSIONS'],
      'CONVERSIONS': ['IMPRESSIONS'],
      'VIDEO_VIEWS': ['VIDEO_VIEWS', 'THRUPLAY', 'IMPRESSIONS'],
      'THRUPLAY': ['THRUPLAY', 'IMPRESSIONS']
    };

    const validBillingEvents = validCombinations[adSetData.optimization_goal] || [];
    if (!validBillingEvents.includes(adSetData.billing_event)) {
      return NextResponse.json(
        { error: `Billing event ${adSetData.billing_event} is not compatible with optimization goal ${adSetData.optimization_goal}` },
        { status: 400 }
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

    // Prepare ad set payload for Facebook API
    const adSetPayload = {
      name: adSetData.name,
      campaign_id: campaignId,
      optimization_goal: adSetData.optimization_goal,
      billing_event: adSetData.billing_event,
      targeting: adSetData.targeting,
      status: adSetData.status || 'PAUSED',
      bid_strategy: adSetData.bid_strategy || 'LOWEST_COST_WITHOUT_CAP',
      ...(adSetData.bid_amount && { bid_amount: adSetData.bid_amount }),
      ...(!isCBOEnabled && adSetData.daily_budget && { daily_budget: adSetData.daily_budget }),
      ...(!isCBOEnabled && adSetData.lifetime_budget && { lifetime_budget: adSetData.lifetime_budget }),
      ...(adSetData.start_time && { start_time: adSetData.start_time }),
      ...(adSetData.end_time && { end_time: adSetData.end_time })
    };

    // Create ad set via Facebook Graph API
    const params = new URLSearchParams();
    Object.entries(adSetPayload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          params.append(key, JSON.stringify(value));
        } else {
          params.append(key, String(value));
        }
      }
    });

    const response = await fetch(`https://graph.facebook.com/v23.0/${campaignId}/adsets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        errorData = await response.json();
      } catch {
        // Ignore JSON parsing errors
      }

      const errorMessage = errorData.error?.message || response.statusText;
      console.error('Facebook API error creating ad set:', errorData);

      // Handle specific Facebook API error codes
      let statusCode = 400;
      if (errorData.error?.code === 200 || errorMessage.toLowerCase().includes('permission')) {
        statusCode = 403;
      } else if (errorMessage.toLowerCase().includes('not found')) {
        statusCode = 404;
      } else if (errorMessage.toLowerCase().includes('rate limit')) {
        statusCode = 429;
      }

      return NextResponse.json(
        { error: `Failed to create ad set: ${errorMessage}` },
        { status: statusCode }
      );
    }

    const createdAdSet = await response.json();
    console.log('Ad set created successfully:', createdAdSet.id);

    // Save ad set to database
    const adSetDbData = {
      id: createdAdSet.id,
      campaign_id: campaignId,
      name: adSetData.name,
      status: adSetData.status || 'PAUSED',
      daily_budget: adSetData.daily_budget || null,
      lifetime_budget: adSetData.lifetime_budget || null,
      targeting: adSetData.targeting,
      optimization_goal: adSetData.optimization_goal,
      billing_event: adSetData.billing_event,
      bid_amount: adSetData.bid_amount || null,
      created_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString()
    };

    const { error: dbError } = await supabase
      .from('facebook_ad_sets')
      .insert(adSetDbData);

    if (dbError) {
      console.error('Error inserting ad set into database:', dbError);
      // Don't fail the request if database insertion fails
    }

    return NextResponse.json({
      success: true,
      adSet: createdAdSet
    });

  } catch (error) {
    console.error('Error creating ad set:', error);
    return NextResponse.json(
      { error: 'Failed to create ad set' },
      { status: 500 }
    );
  }
}