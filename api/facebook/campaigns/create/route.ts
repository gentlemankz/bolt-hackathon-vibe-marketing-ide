import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookService } from '@/lib/services/facebook-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { adAccountId, campaignData } = body;

    if (!adAccountId || !campaignData) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Validate required campaign fields
    if (!campaignData.name || !campaignData.objective) {
      return NextResponse.json({ 
        error: 'Missing required campaign fields: name and objective are required' 
      }, { status: 400 });
    }

    const facebookService = new FacebookService(supabase);
    const accessToken = await facebookService.getAccessToken(user.id);

    if (!accessToken) {
      return NextResponse.json({ error: 'Facebook access token not found' }, { status: 401 });
    }

    // Create campaign via Meta Marketing API
    const campaignPayload = {
      name: campaignData.name,
      objective: campaignData.objective,
      status: campaignData.status || 'PAUSED',
      special_ad_categories: campaignData.special_ad_categories || [],
      ...(campaignData.daily_budget && { daily_budget: campaignData.daily_budget }),
      ...(campaignData.lifetime_budget && { lifetime_budget: campaignData.lifetime_budget }),
      ...(campaignData.buying_type && { buying_type: campaignData.buying_type }),
    };

    // Ensure ad account ID has proper format (should start with 'act_')
    // Remove any existing 'act_' prefix and add it back to avoid double prefixing
    const cleanAdAccountId = adAccountId.replace(/^act_/, '');
    const formattedAdAccountId = `act_${cleanAdAccountId}`;

    console.log('Creating campaign with:', {
      originalAdAccountId: adAccountId,
      cleanAdAccountId,
      formattedAdAccountId,
      campaignData,
      url: `https://graph.facebook.com/v23.0/${formattedAdAccountId}/campaigns`
    });

    // Prepare the request body
    const requestBody = new URLSearchParams();
    requestBody.append('name', campaignPayload.name);
    requestBody.append('objective', campaignPayload.objective);
    requestBody.append('status', campaignPayload.status);
    requestBody.append('special_ad_categories', JSON.stringify(campaignPayload.special_ad_categories));
    requestBody.append('access_token', accessToken);
    
    // Add optional fields only if they exist
    if (campaignPayload.daily_budget) {
      requestBody.append('daily_budget', campaignPayload.daily_budget);
    }
    if (campaignPayload.lifetime_budget) {
      requestBody.append('lifetime_budget', campaignPayload.lifetime_budget);
    }
    if (campaignPayload.buying_type) {
      requestBody.append('buying_type', campaignPayload.buying_type);
    }

    console.log('Request body:', requestBody.toString());

    const response = await fetch(
      `https://graph.facebook.com/v23.0/${formattedAdAccountId}/campaigns`,
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
      let errorMessage = 'Failed to create campaign';
      
      if (errorData.error) {
        const { code, message, error_subcode } = errorData.error;
        
        switch (code) {
          case 100:
            if (error_subcode === 33) {
              errorMessage = 'Ad account not found or you do not have permission to access it. Please check your Facebook permissions.';
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
          case 2500:
            errorMessage = 'Campaign name already exists or is invalid. Please choose a different name.';
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

    const createdCampaign = await response.json();

    // Save the campaign to our database
    const { error: dbError } = await supabase
      .from('facebook_campaigns')
      .insert({
        id: createdCampaign.id,
        ad_account_id: adAccountId,
        name: campaignData.name,
        status: campaignData.status || 'PAUSED',
        objective: campaignData.objective,
        buying_type: campaignData.buying_type || 'AUCTION',
        special_ad_categories: campaignPayload.special_ad_categories,
        daily_budget: campaignData.daily_budget || null,
        lifetime_budget: campaignData.lifetime_budget || null,
        start_time: null,
        stop_time: null,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Campaign was created in Facebook but failed to save locally
      // We should still return success since the campaign exists
    }

    return NextResponse.json({
      success: true,
      campaign: {
        id: createdCampaign.id,
        name: campaignData.name,
        status: campaignData.status || 'PAUSED',
        objective: campaignData.objective,
        ad_account_id: adAccountId,
      },
    });

  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 