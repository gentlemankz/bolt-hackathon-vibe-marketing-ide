import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookService } from '@/lib/services/facebook-service';
import { getUserAdAccounts } from '@/lib/meta-api';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
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

    // Fetch ad accounts from Meta API
    const adAccountsResponse = await getUserAdAccounts(accessToken);
    
    // Get connected ad accounts from database
    const { data: connectedAccounts } = await supabase
      .from('facebook_ad_accounts')
      .select('id')
      .eq('user_id', user.id);

    const connectedAccountIds = new Set(connectedAccounts?.map(acc => acc.id) || []);

    // Map ad accounts with connection status
    const adAccountsWithStatus = adAccountsResponse.data.map(account => ({
      ...account,
      isConnected: connectedAccountIds.has(account.id)
    }));

    return NextResponse.json({
      adAccounts: adAccountsWithStatus
    });

  } catch (error) {
    console.error('Error fetching ad accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ad accounts' },
      { status: 500 }
    );
  }
}