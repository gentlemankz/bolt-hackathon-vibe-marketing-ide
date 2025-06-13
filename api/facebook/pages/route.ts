import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface FacebookPageData {
  id: string;
  name: string;
  category?: string;
  category_list?: Array<{ name: string }>;
  source: string;
  username?: string;
  connected_page_id?: string;
  connected_page_name?: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== PAGES API AUTHENTICATION DEBUG ===');
    console.log('Request cookies:', request.cookies.getAll().map(c => c.name));
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Supabase auth result:', { user: user?.id, error: authError?.message });

    if (authError || !user) {
      console.log('❌ Authentication failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Authentication successful for user:', user.id);

    const { searchParams } = new URL(request.url);
    const adAccountId = searchParams.get('adAccountId');

    console.log('📋 Request parameters:', { adAccountId });

    if (!adAccountId) {
      return NextResponse.json({ error: 'Ad account ID is required' }, { status: 400 });
    }

    console.log('🔍 Looking up access token and ad account in database...');

    // First, get the user's access token from facebook_tokens table
    const { data: tokenData, error: tokenError } = await supabase
      .from('facebook_tokens')
      .select('access_token, expires_at, has_ad_permissions')
      .eq('user_id', user.id)
      .single();

    console.log('🔑 Token lookup result:', {
      found: !!tokenData,
      error: tokenError?.message,
      hasToken: !!tokenData?.access_token,
      hasAdPermissions: tokenData?.has_ad_permissions,
      expiresAt: tokenData?.expires_at
    });

    if (tokenError || !tokenData?.access_token) {
      console.log('❌ No valid access token found');
      return NextResponse.json({ 
        error: 'No Facebook access token found. Please reconnect your Facebook account.',
        details: tokenError?.message
      }, { status: 403 });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (now >= expiresAt) {
      console.log('❌ Access token expired');
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

    console.log('🏢 Ad account lookup result:', {
      found: !!adAccountData,
      error: adAccountError?.message,
      accountId: adAccountData?.account_id
    });

    if (adAccountError || !adAccountData) {
      console.log('❌ Ad account access denied:', adAccountError?.message);
      return NextResponse.json({ 
        error: 'Ad account not found or access denied',
        details: adAccountError?.message
      }, { status: 403 });
    }

    console.log('✅ Access token and ad account verified successfully');
    console.log('🚀 Making Facebook API calls...');

    const accessToken = tokenData.access_token;
    const pages: FacebookPageData[] = [];
    const errors: string[] = [];

    // Method 1: Get promote pages (pages that can be promoted by this ad account)
    try {
      console.log('📄 Trying Method 1: /promote_pages endpoint...');
      const promoteResponse = await fetch(
        `https://graph.facebook.com/v23.0/${adAccountId}/promote_pages?access_token=${accessToken}`,
        { method: 'GET' }
      );

      console.log('📄 Promote pages response status:', promoteResponse.status);

      if (promoteResponse.ok) {
        const promoteData = await promoteResponse.json();
        console.log('📄 Promote pages data:', promoteData);
        
        if (promoteData.data && Array.isArray(promoteData.data)) {
          pages.push(...promoteData.data.map((page: FacebookPageData) => ({
            ...page,
            source: 'promote_pages'
          })));
          console.log('✅ Found', promoteData.data.length, 'promote pages');
        }
      } else {
        const errorText = await promoteResponse.text();
        console.log('❌ Promote pages error:', errorText);
        errors.push(`Promote pages: ${errorText}`);
      }
    } catch (error) {
      console.log('❌ Promote pages exception:', error);
      errors.push(`Promote pages exception: ${error}`);
    }

    // Method 2: Get user's pages (fallback)
    try {
      console.log('📄 Trying Method 2: /me/accounts endpoint...');
      const accountsResponse = await fetch(
        `https://graph.facebook.com/v23.0/me/accounts?access_token=${accessToken}`,
        { method: 'GET' }
      );

      console.log('📄 User accounts response status:', accountsResponse.status);

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        console.log('📄 User accounts data:', accountsData);
        
        if (accountsData.data && Array.isArray(accountsData.data)) {
          // Filter for pages only
          const userPages = accountsData.data.filter((account: FacebookPageData) => 
            account.category_list || account.category
          );
          pages.push(...userPages.map((page: FacebookPageData) => ({
            ...page,
            source: 'user_accounts'
          })));
          console.log('✅ Found', userPages.length, 'user pages');
        }
      } else {
        const errorText = await accountsResponse.text();
        console.log('❌ User accounts error:', errorText);
        errors.push(`User accounts: ${errorText}`);
      }
    } catch (error) {
      console.log('❌ User accounts exception:', error);
      errors.push(`User accounts exception: ${error}`);
    }

    // Method 3: Get Instagram accounts (additional)
    try {
      console.log('📄 Trying Method 3: /me/instagram_accounts endpoint...');
      const instagramResponse = await fetch(
        `https://graph.facebook.com/v23.0/me/instagram_accounts?access_token=${accessToken}`,
        { method: 'GET' }
      );

      console.log('📄 Instagram accounts response status:', instagramResponse.status);

      if (instagramResponse.ok) {
        const instagramData = await instagramResponse.json();
        console.log('📄 Instagram accounts data:', instagramData);
        
        if (instagramData.data && Array.isArray(instagramData.data)) {
          pages.push(...instagramData.data.map((account: FacebookPageData) => ({
            ...account,
            source: 'instagram_accounts',
            name: account.name || account.username || 'Instagram Account'
          })));
          console.log('✅ Found', instagramData.data.length, 'Instagram accounts');
        }
      } else {
        const errorText = await instagramResponse.text();
        console.log('❌ Instagram accounts error:', errorText);
        errors.push(`Instagram accounts: ${errorText}`);
      }
    } catch (error) {
      console.log('❌ Instagram accounts exception:', error);
      errors.push(`Instagram accounts exception: ${error}`);
    }

    console.log('📊 Final results:', {
      totalPages: pages.length,
      totalErrors: errors.length,
      pagesSources: pages.map(p => p.source)
    });

    if (pages.length === 0) {
      return NextResponse.json({
        error: 'No pages found',
        details: 'Could not fetch any Facebook pages or Instagram accounts.',
        troubleshooting: {
          errors,
          suggestions: [
            'Make sure you have Facebook pages connected to your account',
            'Verify that your Facebook app has the required permissions:',
            '  - ads_management (for promote_pages)',
            '  - pages_show_list (for user pages)',
            '  - instagram_basic (for Instagram accounts)',
            'Try reconnecting your Facebook account to refresh permissions'
          ]
        }
      }, { status: 404 });
    }

    // Remove duplicates based on ID
    const uniquePages = pages.filter((page, index, self) => 
      index === self.findIndex(p => p.id === page.id)
    );

    console.log('✅ Successfully fetched', uniquePages.length, 'unique pages');

    // Separate Facebook pages and Instagram accounts
    const facebookPages = uniquePages
      .filter(page => page.source !== 'instagram_accounts')
      .map(page => ({
        id: page.id,
        name: page.name,
        category: page.category || page.category_list?.[0]?.name || 'Page',
        type: 'facebook_page' as const
      }));

    const instagramAccounts = uniquePages
      .filter(page => page.source === 'instagram_accounts')
      .map(account => ({
        id: account.id,
        name: account.name,
        username: account.username || account.name,
        type: 'instagram_account' as const,
        connected_page_id: account.connected_page_id || null,
        connected_page_name: account.connected_page_name || null
      }));

    // Determine default selection (prefer Facebook pages over Instagram)
    const totalAccounts = facebookPages.length + instagramAccounts.length;
    let defaultPageId = null;
    let defaultPageName = null;
    let defaultPageType = null;

    if (facebookPages.length > 0) {
      defaultPageId = facebookPages[0].id;
      defaultPageName = facebookPages[0].name;
      defaultPageType = 'facebook_page';
    } else if (instagramAccounts.length > 0) {
      defaultPageId = instagramAccounts[0].id;
      defaultPageName = instagramAccounts[0].name || instagramAccounts[0].username;
      defaultPageType = 'instagram_account';
    }

    const sourcesArray = Array.from(new Set(pages.map(p => p.source)));

    return NextResponse.json({
      success: true,
      pages: facebookPages,
      instagramAccounts,
      defaultPageId,
      defaultPageName,
      defaultPageType,
      totalAccounts,
      debug: {
        totalFetched: pages.length,
        uniqueCount: uniquePages.length,
        sources: sourcesArray,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('❌ Pages API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}