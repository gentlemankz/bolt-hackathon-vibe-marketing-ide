import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookService } from '@/lib/services/facebook-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adsetId, adData } = body;

    console.log('Ad creation request:', { adsetId, adData });

    if (!adsetId || !adData) {
      return NextResponse.json(
        { error: 'Ad set ID and ad data are required' },
        { status: 400 }
      );
    }

    // Validate required ad fields
    if (!adData.name || !adData.creative) {
      return NextResponse.json(
        { error: 'Ad name and creative are required' },
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

    // Verify user has access to this ad set
    const { data: adSet, error: adSetError } = await supabase
      .from('facebook_ad_sets')
      .select(`
        *,
        facebook_campaigns!inner(
          id,
          facebook_ad_accounts!inner(user_id)
        )
      `)
      .eq('id', adsetId)
      .eq('facebook_campaigns.facebook_ad_accounts.user_id', user.id)
      .single();

    if (adSetError || !adSet) {
      return NextResponse.json(
        { error: 'Ad set not found or access denied' },
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

    // Create creative first
    console.log('Creating ad creative');
    const creativePayload = {
      name: adData.creative.name,
      object_story_spec: adData.creative.object_story_spec
    };

    const creativeParams = new URLSearchParams();
    Object.entries(creativePayload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          creativeParams.append(key, JSON.stringify(value));
        } else {
          creativeParams.append(key, String(value));
        }
      }
    });

    // Get ad account ID from ad set's campaign
    const adAccountId = adSet.facebook_campaigns.facebook_ad_accounts.id;

    const creativeResponse = await fetch(`https://graph.facebook.com/v23.0/${adAccountId}/adcreatives`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: creativeParams.toString()
    });

    if (!creativeResponse.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        errorData = await creativeResponse.json();
      } catch {
        // Ignore JSON parsing errors
      }

      const errorMessage = errorData.error?.message || creativeResponse.statusText;
      console.error('Facebook API error creating creative:', errorData);

      return NextResponse.json(
        { error: `Failed to create creative: ${errorMessage}` },
        { status: 400 }
      );
    }

    const createdCreative = await creativeResponse.json();
    console.log('Creative created successfully:', createdCreative.id);

    // Create ad with the creative
    console.log('Creating ad with creative:', createdCreative.id);
    const adPayload = {
      name: adData.name,
      adset_id: adsetId,
      creative: {
        creative_id: createdCreative.id
      },
      status: adData.status || 'PAUSED'
    };

    // Add tracking specs if provided
    if (adData.tracking_specs) {
      adPayload.tracking_specs = adData.tracking_specs;
    }

    // Development mode fallback - use simplified creative structure
    const isDevelopmentMode = process.env.NODE_ENV === 'development';
    if (isDevelopmentMode) {
      console.log('Development mode: Using simplified ad creation');
      adPayload.creative = {
        creative_id: createdCreative.id,
        // Fallback creative structure for development
        object_story_spec: adData.creative.object_story_spec
      };
    }

    const adParams = new URLSearchParams();
    Object.entries(adPayload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          adParams.append(key, JSON.stringify(value));
        } else {
          adParams.append(key, String(value));
        }
      }
    });

    const adResponse = await fetch(`https://graph.facebook.com/v23.0/${adsetId}/ads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: adParams.toString()
    });

    if (!adResponse.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        errorData = await adResponse.json();
      } catch {
        // Ignore JSON parsing errors
      }

      const errorMessage = errorData.error?.message || adResponse.statusText;
      console.error('Facebook API error creating ad:', errorData);

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
        { error: `Failed to create ad: ${errorMessage}` },
        { status: statusCode }
      );
    }

    const createdAd = await response.json();
    console.log('Ad created successfully:', createdAd.id);

    // Save ad to database
    const adDbData = {
      id: createdAd.id,
      ad_set_id: adsetId,
      name: adData.name,
      status: adData.status || 'PAUSED',
      creative: {
        id: createdCreative.id,
        name: adData.creative.name,
        ...adData.creative.object_story_spec
      },
      campaign_id: adSet.facebook_campaigns.id,
      bid_amount: null,
      configured_status: adData.status || 'PAUSED',
      created_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString()
    };

    const { error: dbError } = await supabase
      .from('facebook_ads')
      .insert(adDbData);

    if (dbError) {
      console.error('Error inserting ad into database:', dbError);
      // Don't fail the request if database insertion fails
    }

    return NextResponse.json({
      success: true,
      ad: createdAd,
      creative: createdCreative
    });

  } catch (error) {
    console.error('Error creating ad:', error);
    return NextResponse.json(
      { error: 'Failed to create ad' },
      { status: 500 }
    );
  }
}