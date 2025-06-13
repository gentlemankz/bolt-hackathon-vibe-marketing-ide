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

    // Get the ad account ID from query params
    const searchParams = request.nextUrl.searchParams;
    const adAccountId = searchParams.get('adAccountId');

    if (!adAccountId) {
      return NextResponse.json(
        { error: 'Ad account ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this ad account
    const { data: adAccount, error: adAccountError } = await supabase
      .from('facebook_ad_accounts')
      .select('id')
      .eq('id', adAccountId)
      .eq('user_id', user.id)
      .single();

    if (adAccountError || !adAccount) {
      return NextResponse.json(
        { error: 'Ad account not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch campaigns for this ad account
    const { data: campaigns, error: campaignsError } = await supabase
      .from('facebook_campaigns')
      .select('*')
      .eq('ad_account_id', adAccountId)
      .order('created_at', { ascending: false });

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      return NextResponse.json(
        { error: `Failed to fetch campaigns: ${campaignsError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ campaigns: campaigns || [] });
  } catch (error) {
    console.error('Error in campaigns API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 