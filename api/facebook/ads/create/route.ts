import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AdCreateRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { adsetId, adData }: { adsetId: string; adData: AdCreateRequest } = await request.json();

    if (!adsetId || !adData) {
      return NextResponse.json({ error: 'Ad set ID and ad data are required' }, { status: 400 });
    }

    // Validate required fields
    if (!adData.name?.trim()) {
      return NextResponse.json({ error: 'Ad name is required' }, { status: 400 });
    }

    if (!adData.creative?.name?.trim()) {
      return NextResponse.json({ error: 'Creative name is required' }, { status: 400 });
    }

    // Get the ad set to find the ad account and verify access
    const { data: adSet, error: adSetError } = await supabase
      .from('facebook_ad_sets')
      .select('id, name, campaign_id, facebook_campaigns(ad_account_id)')
      .eq('id', adsetId)
      .single();

    if (adSetError || !adSet) {
      return NextResponse.json({ error: 'Ad set not found' }, { status: 404 });
    }

    const adAccountId = Array.isArray(adSet.facebook_campaigns) 
      ? (adSet.facebook_campaigns[0] as Record<string, unknown>)?.ad_account_id 
      : (adSet.facebook_campaigns as Record<string, unknown>)?.ad_account_id;
    if (!adAccountId) {
      return NextResponse.json({ error: 'Ad account not found for this ad set' }, { status: 404 });
    }

    // First, get the user's access token from facebook_tokens table
    const { data: tokenData, error: tokenError } = await supabase
      .from('facebook_tokens')
      .select('access_token, expires_at, has_ad_permissions')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData?.access_token) {
      return NextResponse.json({ 
        error: 'No Facebook access token found. Please reconnect your Facebook account.',
        details: tokenError?.message
      }, { status: 403 });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (now >= expiresAt) {
      return NextResponse.json({ 
        error: 'Facebook access token has expired. Please reconnect your Facebook account.'
      }, { status: 403 });
    }

    // Then, verify the ad account exists and belongs to the user
    const { data: adAccountData, error: adAccountError } = await supabase
      .from('facebook_ad_accounts')
      .select('id, name, account_id')
      .eq('id', adAccountId)
      .eq('user_id', user.id)
      .single();

    if (adAccountError || !adAccountData) {
      return NextResponse.json({ 
        error: 'Ad account not found or access denied',
        details: adAccountError?.message
      }, { status: 403 });
    }

    const accessToken = tokenData.access_token;

    // Clean ad account ID (remove 'act_' prefix if present)
    const cleanAdAccountId = String(adAccountId).replace(/^act_/, '');
    const formattedAdAccountId = `act_${cleanAdAccountId}`;

    console.log('Creating ad with:', {
      adsetId,
      adAccountId: formattedAdAccountId,
      adData,
      isTestAccount: formattedAdAccountId.includes('test') || adAccountData.name?.toLowerCase().includes('test'),
      tokenHasAdPermissions: tokenData.has_ad_permissions,
    });

    // Prepare ad creative payload
    const creativePayload = {
      name: adData.creative.name,
      object_story_spec: JSON.stringify(adData.creative.object_story_spec),
      ...(adData.creative.degrees_of_freedom_spec && {
        degrees_of_freedom_spec: JSON.stringify(adData.creative.degrees_of_freedom_spec)
      }),
    };

    // Create ad creative first
    const creativeUrl = `https://graph.facebook.com/v23.0/${formattedAdAccountId}/adcreatives`;
    const creativeBody = new URLSearchParams();
    creativeBody.append('name', creativePayload.name);
    creativeBody.append('object_story_spec', creativePayload.object_story_spec);
    if (creativePayload.degrees_of_freedom_spec) {
      creativeBody.append('degrees_of_freedom_spec', creativePayload.degrees_of_freedom_spec);
    }
    creativeBody.append('access_token', accessToken);

    console.log('Creating ad creative:', creativeUrl);
    console.log('Creative body:', creativeBody.toString());

    const creativeResponse = await fetch(creativeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: creativeBody,
    });

    const creativeResult = await creativeResponse.json();

    if (!creativeResponse.ok) {
      console.error('Facebook Creative API error:', creativeResult);
      
      // If it's a development mode error, try creating a simpler creative
      if (creativeResult.error?.error_subcode === 1885183) {
        console.log('Development mode restriction detected, trying simpler creative...');
        
        // Create a simpler creative without degrees_of_freedom_spec
        const simpleCreativeBody = new URLSearchParams();
        simpleCreativeBody.append('name', adData.creative.name);
        simpleCreativeBody.append('object_story_spec', JSON.stringify(adData.creative.object_story_spec));
        simpleCreativeBody.append('access_token', accessToken);
        
        console.log('Trying simple creative body:', simpleCreativeBody.toString());
        
        const simpleCreativeResponse = await fetch(creativeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: simpleCreativeBody,
        });
        
        const simpleCreativeResult = await simpleCreativeResponse.json();
        
        if (!simpleCreativeResponse.ok) {
          console.error('Simple creative also failed:', simpleCreativeResult);
          return NextResponse.json({ 
            error: 'Failed to create ad creative. This might be due to Facebook App being in development mode. Please ensure your app has proper Marketing API access and consider using a test ad account.',
            details: simpleCreativeResult.error?.message || 'Unknown error',
            facebook_error: simpleCreativeResult.error,
            suggestion: 'Try using a Facebook Test Ad Account or switch your app to Live mode after App Review.'
          }, { status: 400 });
        }
        
        // Use the simple creative result
        Object.assign(creativeResult, simpleCreativeResult);
      } else {
        return NextResponse.json({ 
          error: 'Failed to create ad creative',
          details: creativeResult.error?.message || 'Unknown error',
          facebook_error: creativeResult.error
        }, { status: 400 });
      }
    }

    const creativeId = creativeResult.id;
    console.log('Created ad creative:', creativeId);

    // Now create the ad
    const adUrl = `https://graph.facebook.com/v23.0/${formattedAdAccountId}/ads`;
    const adBody = new URLSearchParams();
    adBody.append('name', adData.name);
    adBody.append('adset_id', adsetId);
    adBody.append('creative', JSON.stringify({ creative_id: creativeId }));
    adBody.append('status', adData.status || 'PAUSED');
    
    // Add tracking specs if provided
    if (adData.tracking_specs && adData.tracking_specs.length > 0) {
      adBody.append('tracking_specs', JSON.stringify(adData.tracking_specs));
    }
    
    adBody.append('access_token', accessToken);

    console.log('Creating ad:', adUrl);
    console.log('Ad body:', adBody.toString());

    const adResponse = await fetch(adUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: adBody,
    });

    const adResult = await adResponse.json();

    if (!adResponse.ok) {
      console.error('Facebook Ad API error:', adResult);
      return NextResponse.json({ 
        error: 'Failed to create ad',
        details: adResult.error?.message || 'Unknown error',
        facebook_error: adResult.error
      }, { status: 400 });
    }

    console.log('Created ad:', adResult);

    // Save ad to database
    const { data: savedAd, error: saveError } = await supabase
      .from('facebook_ads')
      .insert({
        id: adResult.id,
        ad_set_id: adsetId,
        name: adData.name,
        status: adData.status || 'PAUSED',
        creative: {
          id: creativeId,
          name: adData.creative.name,
          object_story_spec: adData.creative.object_story_spec
        },
        campaign_id: adSet.campaign_id,
        bid_amount: null,
        configured_status: adData.status || 'PAUSED',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving ad to database:', saveError);
      // Don't fail the request if database save fails
    }

    return NextResponse.json({
      success: true,
      ad: adResult,
      creative: creativeResult,
      saved_ad: savedAd,
    });

  } catch (error) {
    console.error('Error creating ad:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 