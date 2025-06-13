import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
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

    // Delete all user's Facebook data from database
    
    // 1. Delete ad account related data
    const { error: adAccountsError } = await supabase
      .from('facebook_ad_accounts')
      .delete()
      .eq('user_id', user.id);
    
    if (adAccountsError) {
      console.error('Error deleting ad accounts:', adAccountsError);
    }
    
    // 2. Delete metrics data
    const { error: metricsError } = await supabase
      .from('facebook_metrics')
      .delete()
      .eq('user_id', user.id);
      
    if (metricsError) {
      console.error('Error deleting metrics:', metricsError);
    }
    
    // 3. Delete business accounts
    const { error: businessError } = await supabase
      .from('facebook_business_accounts')
      .delete()
      .eq('user_id', user.id);
      
    if (businessError) {
      console.error('Error deleting business accounts:', businessError);
    }
    
    // 4. Delete tokens (should be done last)
    const { error: tokensError } = await supabase
      .from('facebook_tokens')
      .delete()
      .eq('user_id', user.id);
      
    if (tokensError) {
      console.error('Error deleting tokens:', tokensError);
    }
    
    // Return success response
    return NextResponse.json(
      { message: 'Facebook account disconnected successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error disconnecting Facebook account:', error);
    
    // Detailed error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 