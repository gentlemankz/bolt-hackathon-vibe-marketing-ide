import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookService } from '@/lib/services/facebook-service';
import { getUserAdAccounts } from '@/lib/meta-api';

export async function GET() {
  try {
    // Get the user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the Facebook access token
    const facebookService = new FacebookService(supabase);
    const accessToken = await facebookService.getAccessToken(user.id);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Facebook access token not found or expired' },
        { status: 401 }
      );
    }
    
    // Get the ad accounts from Facebook
    const response = await getUserAdAccounts(accessToken);
    
    // Get the connected ad accounts from Supabase
    const connectedAccounts = await facebookService.getAdAccounts(user.id);
    const connectedIds = new Set(connectedAccounts.map(account => account.id));
    
    // Add a flag to indicate if the ad account is already connected
    const adAccounts = response.data.map((account: { 
      id: string; 
      name: string; 
      account_id: string;
      account_status: number;
      amount_spent: string;
      balance: string;
      currency: string;
    }) => ({
      ...account,
      isConnected: connectedIds.has(account.id)
    }));
    
    return NextResponse.json({ adAccounts });
  } catch (error: unknown) {
    console.error('Error getting Facebook ad accounts:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 