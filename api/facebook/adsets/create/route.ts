import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookService } from '@/lib/services/facebook-service';
import { isValidOptimizationBillingCombination } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { campaignId, adSetData } = body;

    if (!campaignId || !adSetData) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Validate required ad set fields
    if (!adSetData.name || !adSetData.targeting || !adSetData.optimization_goal || !adSetData.billing_event || !adSetData.bid_amount) {
      return NextResponse.json({ 
        error: 'Missing required ad set fields: name, targeting, optimization_goal, billing_event, and bid_amount are required' 
      }, { status: 400 });
    }

    // Validate budget based on campaign settings
    const { data: campaign, error: campaignError } = await supabase
      .from('facebook_campaigns')
      .select('ad_account_id, name, daily_budget, lifetime_budget')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if campaign has Campaign Budget Optimization (CBO) enabled
    const campaignHasCBO = !!(campaign.daily_budget || campaign.lifetime_budget);

    console.log('Campaign budget info:', {
      campaignId,
      campaignName: campaign.name,
      campaignDailyBudget: campaign.daily_budget,
      campaignLifetimeBudget: campaign.lifetime_budget,
      campaignHasCBO,
    });

    // Verify user has access to the ad account
    const { data: adAccount, error: adAccountError } = await supabase
      .from('facebook_ad_accounts')
      .select('id')
      .eq('id', campaign.ad_account_id)
      .eq('user_id', user.id)
      .single();

    if (adAccountError || !adAccount) {
      return NextResponse.json({ error: 'Access denied to this campaign' }, { status: 403 });
    }

    const facebookService = new FacebookService(supabase);
    const accessToken = await facebookService.getAccessToken(user.id);

    if (!accessToken) {
      return NextResponse.json({ error: 'Facebook access token not found' }, { status: 401 });
    }

    // Validate budget based on campaign settings
    if (campaignHasCBO) {
      // Campaign has CBO enabled - ad sets cannot have budgets
      if (adSetData.daily_budget || adSetData.lifetime_budget) {
        return NextResponse.json({ 
          error: 'This campaign uses Campaign Budget Optimization (CBO). Ad sets cannot have their own budgets when CBO is enabled. Please remove the budget from the ad set.' 
        }, { status: 400 });
      }
    } else {
      // Campaign does not have CBO - ad sets must have budgets
      if (!adSetData.daily_budget && !adSetData.lifetime_budget) {
        return NextResponse.json({ 
          error: 'Either daily_budget or lifetime_budget is required for ad sets when Campaign Budget Optimization is not enabled' 
        }, { status: 400 });
      }
    }

    // Validate optimization goal and billing event combination
    if (!isValidOptimizationBillingCombination(adSetData.optimization_goal, adSetData.billing_event)) {
      return NextResponse.json({ 
        error: `Billing event "${adSetData.billing_event}" is not compatible with optimization goal "${adSetData.optimization_goal}". Please select a compatible billing event.` 
      }, { status: 400 });
    }

    // Prepare ad set payload for Facebook API
    const adSetPayload = {
      name: adSetData.name,
      campaign_id: campaignId,
      targeting: JSON.stringify({
        ...adSetData.targeting,
        targeting_automation: {
          advantage_audience: 0, // Disable Advantage Audience (0 = disabled, 1 = enabled)
        },
      }),
      optimization_goal: adSetData.optimization_goal,
      billing_event: adSetData.billing_event,
      bid_strategy: adSetData.bid_strategy || 'LOWEST_COST_WITHOUT_CAP',
      status: adSetData.status || 'PAUSED',
      // Only include bid_amount for manual bidding strategies
      ...(adSetData.bid_amount && (adSetData.bid_strategy === 'LOWEST_COST_WITH_BID_CAP' || adSetData.bid_strategy === 'TARGET_COST') && { bid_amount: adSetData.bid_amount }),
      // Only include budget fields if campaign doesn't have CBO
      ...(!campaignHasCBO && adSetData.daily_budget && { daily_budget: adSetData.daily_budget }),
      ...(!campaignHasCBO && adSetData.lifetime_budget && { lifetime_budget: adSetData.lifetime_budget }),
      ...(adSetData.start_time && { start_time: adSetData.start_time }),
      ...(adSetData.end_time && { end_time: adSetData.end_time }),
    };

    // Remove any existing 'act_' prefix and add it back to avoid double prefixing
    const cleanAdAccountId = campaign.ad_account_id.replace(/^act_/, '');
    const formattedAdAccountId = `act_${cleanAdAccountId}`;

    console.log('Creating ad set with:', {
      originalAdAccountId: adAccount.id,
      cleanAdAccountId,
      formattedAdAccountId,
      campaignId,
      adSetData: {
        ...adSetData,
        targeting: {
          ...adSetData.targeting,
          targeting_automation: {
            advantage_audience: 0,
          },
        },
      },
      url: `https://graph.facebook.com/v23.0/${formattedAdAccountId}/adsets`
    });

    // Prepare the request body
    const requestBody = new URLSearchParams();
    requestBody.append('name', adSetPayload.name);
    requestBody.append('campaign_id', adSetPayload.campaign_id);
    requestBody.append('targeting', adSetPayload.targeting);
    requestBody.append('optimization_goal', adSetPayload.optimization_goal);
    requestBody.append('billing_event', adSetPayload.billing_event);
    requestBody.append('bid_strategy', adSetPayload.bid_strategy);
    requestBody.append('status', adSetPayload.status);
    requestBody.append('access_token', accessToken);
    
    // Add optional fields only if they exist
    if (adSetPayload.bid_amount) {
      requestBody.append('bid_amount', adSetPayload.bid_amount);
    }
    if (adSetPayload.daily_budget) {
      requestBody.append('daily_budget', adSetPayload.daily_budget);
    }
    if (adSetPayload.lifetime_budget) {
      requestBody.append('lifetime_budget', adSetPayload.lifetime_budget);
    }
    if (adSetPayload.start_time) {
      requestBody.append('start_time', adSetPayload.start_time);
    }
    if (adSetPayload.end_time) {
      requestBody.append('end_time', adSetPayload.end_time);
    }

    console.log('Request body:', requestBody.toString());
    console.log('Campaign has CBO:', campaignHasCBO, '- Budget fields excluded from ad set');

    const response = await fetch(
      `https://graph.facebook.com/v23.0/${formattedAdAccountId}/adsets`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBody,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Facebook API error:', errorData);
      
      // Provide more specific error messages based on Facebook error codes
      let errorMessage = 'Failed to create ad set';
      
      if (errorData.error) {
        const { code, message, error_subcode } = errorData.error;
        
        switch (code) {
          case 100:
            if (error_subcode === 33) {
              errorMessage = 'Campaign not found or you do not have permission to access it. Please check your Facebook permissions.';
            } else {
              errorMessage = 'Invalid request or missing permissions. Please reconnect your Facebook account.';
            }
            break;
          case 200:
            errorMessage = 'Missing required permissions. Please reconnect your Facebook account with ads_management permissions.';
            break;
          case 190:
            errorMessage = 'Access token expired or invalid. Please reconnect your Facebook account.';
            break;
          case 1487:
            errorMessage = 'Invalid targeting parameters. Please check your audience targeting settings.';
            break;
          case 1885:
            errorMessage = 'Invalid optimization goal or billing event combination. Please check your settings.';
            break;
          default:
            errorMessage = message || 'Unknown Facebook API error';
        }
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: errorData 
      }, { status: response.status });
    }

    const createdAdSet = await response.json();

    // Save the ad set to our database
    const { error: dbError } = await supabase
      .from('facebook_ad_sets')
      .insert({
        id: createdAdSet.id,
        campaign_id: campaignId,
        name: adSetData.name,
        status: adSetData.status || 'PAUSED',
        daily_budget: adSetData.daily_budget || null,
        lifetime_budget: adSetData.lifetime_budget || null,
        targeting: adSetData.targeting,
        optimization_goal: adSetData.optimization_goal,
        billing_event: adSetData.billing_event,
        bid_amount: adSetData.bid_amount,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Ad set was created in Facebook but failed to save locally
      // We should still return success since the ad set exists
    }

    return NextResponse.json({
      success: true,
      adSet: {
        id: createdAdSet.id,
        name: adSetData.name,
        status: adSetData.status || 'PAUSED',
        optimization_goal: adSetData.optimization_goal,
        billing_event: adSetData.billing_event,
        campaign_id: campaignId,
      },
    });

  } catch (error) {
    console.error('Error creating ad set:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 