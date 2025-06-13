import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adSetId = searchParams.get('adSetId');

    if (!adSetId) {
      return NextResponse.json(
        { error: 'Ad set ID is required' },
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

    // Verify user has access to this ad set through campaign → ad account ownership
    const { data: adSet, error: adSetError } = await supabase
      .from('facebook_ad_sets')
      .select(`
        id,
        facebook_campaigns!inner(
          id,
          facebook_ad_accounts!inner(user_id)
        )
      `)
      .eq('id', adSetId)
      .eq('facebook_campaigns.facebook_ad_accounts.user_id', user.id)
      .single();

    if (adSetError || !adSet) {
      return NextResponse.json(
        { error: 'Ad set not found or access denied' },
        { status: 403 }
      );
    }

    // Fetch ads for the ad set
    const { data: ads, error: adsError } = await supabase
      .from('facebook_ads')
      .select('*')
      .eq('ad_set_id', adSetId)
      .order('created_at', { ascending: false });

    if (adsError) {
      console.error('Error fetching ads:', adsError);
      return NextResponse.json(
        { error: 'Failed to fetch ads' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ads: ads || []
    });

  } catch (error) {
    console.error('Error in ads route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}