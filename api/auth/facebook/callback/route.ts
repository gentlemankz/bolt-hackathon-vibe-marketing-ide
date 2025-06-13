import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken, FACEBOOK_SCOPES } from '@/lib/meta-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const error_reason = searchParams.get('error_reason');
  const error_description = searchParams.get('error_description');
  const _next = searchParams.get('next');
  const next = _next?.startsWith('/') ? _next : '/';

  // Set up redirect URLs
  const successRedirectUrl = '/facebook/select-adaccount';
  const errorRedirectUrl = '/';

  // Handle error cases first
  if (error) {
    console.error('Facebook OAuth error:', {
      error,
      error_reason,
      error_description
    });
    
    const errorParams = new URLSearchParams({
      error: error_description || error_reason || error || 'Facebook authentication failed'
    });
    
    return NextResponse.redirect(new URL(`${errorRedirectUrl}?${errorParams.toString()}`, request.url));
  }

  if (!code) {
    console.error('No authorization code received from Facebook');
    const errorParams = new URLSearchParams({
      error: 'No authorization code received from Facebook'
    });
    
    return NextResponse.redirect(new URL(`${errorRedirectUrl}?${errorParams.toString()}`, request.url));
  }

  try {
    console.log('Exchanging Facebook authorization code for access token');
    
    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code);
    console.log('Token exchange successful:', {
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in
    });

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    console.log('Token expires at:', expiresAt.toISOString());

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Failed to get authenticated user:', userError);
      const errorParams = new URLSearchParams({
        error: 'Authentication required. Please sign in first.'
      });
      
      return NextResponse.redirect(new URL(`${errorRedirectUrl}?${errorParams.toString()}`, request.url));
    }

    console.log('Authenticated user found:', user.id);

    // Verify token permissions by making test API call
    let hasAdPermissions = true;
    try {
      console.log('Verifying token permissions with test API call');
      const testResponse = await fetch(`https://graph.facebook.com/v23.0/me/adaccounts?access_token=${tokenData.access_token}&limit=1`);
      
      if (!testResponse.ok) {
        const testError = await testResponse.json();
        console.warn('Token lacks ad permissions:', testError);
        hasAdPermissions = false;
      } else {
        console.log('Token has ad permissions verified');
      }
    } catch (permissionError) {
      console.warn('Error verifying token permissions:', permissionError);
      hasAdPermissions = false;
    }

    // Store token in database
    console.log('Storing Facebook token in database');
    const { error: insertError } = await supabase
      .from('facebook_tokens')
      .upsert({
        user_id: user.id,
        access_token: tokenData.access_token,
        expires_at: expiresAt.toISOString(),
        has_ad_permissions: hasAdPermissions
      }, {
        onConflict: 'user_id'
      });

    if (insertError) {
      console.error('Failed to store Facebook token:', insertError);
      const errorParams = new URLSearchParams({
        error: 'Failed to save Facebook connection. Please try again.'
      });
      
      return NextResponse.redirect(new URL(`${errorRedirectUrl}?${errorParams.toString()}`, request.url));
    }

    console.log('Facebook token stored successfully');

    // Prepare success redirect
    let redirectUrl = successRedirectUrl;
    const successParams = new URLSearchParams();

    // Add warning if permissions are limited
    if (!hasAdPermissions) {
      console.warn('Token has limited permissions, adding warning to redirect');
      successParams.set('warning', 'Limited permissions detected. Some features may not work properly.');
    }

    if (successParams.toString()) {
      redirectUrl += `?${successParams.toString()}`;
    }

    console.log('Redirecting to success page:', redirectUrl);
    return NextResponse.redirect(new URL(redirectUrl, request.url));

  } catch (error) {
    console.error('Error in Facebook callback:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to complete Facebook authentication';
    const errorParams = new URLSearchParams({
      error: errorMessage
    });
    
    return NextResponse.redirect(new URL(`${errorRedirectUrl}?${errorParams.toString()}`, request.url));
  }
}