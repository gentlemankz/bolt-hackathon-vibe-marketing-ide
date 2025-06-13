import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const adAccountId = formData.get('adAccountId') as string;
    const mediaType = formData.get('mediaType') as string; // 'image' or 'video'

    if (!file || !adAccountId || !mediaType) {
      return NextResponse.json({ 
        error: 'File, ad account ID, and media type are required' 
      }, { status: 400 });
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

    // Clean ad account ID
    const cleanAdAccountId = adAccountId.replace(/^act_/, '');
    const formattedAdAccountId = `act_${cleanAdAccountId}`;

    // Validate file type and size
    const maxSize = mediaType === 'video' ? 4 * 1024 * 1024 * 1024 : 30 * 1024 * 1024; // 4GB for video, 30MB for image
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${mediaType === 'video' ? '4GB' : '30MB'}` 
      }, { status: 400 });
    }

    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'];
    
    if (mediaType === 'image' && !allowedImageTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid image format. Supported: JPG, PNG, GIF' 
      }, { status: 400 });
    }
    
    if (mediaType === 'video' && !allowedVideoTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid video format. Supported: MP4, MOV, AVI' 
      }, { status: 400 });
    }

    console.log('Uploading media:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      mediaType,
      adAccountId: formattedAdAccountId,
    });

    // Prepare Facebook API request
    const endpoint = mediaType === 'image' ? 'adimages' : 'advideos';
    const url = `https://graph.facebook.com/v23.0/${formattedAdAccountId}/${endpoint}`;
    
    const uploadFormData = new FormData();
    uploadFormData.append('access_token', accessToken);
    
    if (mediaType === 'image') {
      // For images, we can upload directly
      uploadFormData.append('filename', file, file.name);
    } else {
      // For videos, we need to use the video upload process
      uploadFormData.append('source', file, file.name);
      uploadFormData.append('name', file.name);
    }

    console.log('Uploading to Facebook:', url);

    const response = await fetch(url, {
      method: 'POST',
      body: uploadFormData,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Facebook Media Upload error:', result);
      return NextResponse.json({ 
        error: 'Failed to upload media to Facebook',
        details: result.error?.message || 'Unknown error',
        facebook_error: result.error
      }, { status: 400 });
    }

    console.log('Media uploaded successfully:', result);

    // For images, the response contains the hash
    // For videos, the response contains the video ID
    const mediaId = mediaType === 'image' 
      ? (result.images?.[file.name]?.hash || result.hash)
      : result.id;

    if (!mediaId) {
      return NextResponse.json({ 
        error: 'Failed to get media ID from Facebook response',
        facebook_response: result
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      mediaType,
      mediaId,
      fileName: file.name,
      fileSize: file.size,
      facebook_response: result,
    });

  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 