import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TavusService } from '@/lib/services/tavus-service';

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Initialize Tavus service
    const tavusService = new TavusService(supabase);
    
    // Check if requesting all replicas (including stock) or just user replicas
    const { searchParams } = new URL(request.url);
    const includeStock = searchParams.get('include_stock') === 'true';
    
    try {
      if (includeStock) {
        // Get both stock and user replicas
        const allReplicas = await tavusService.getAllAvailableReplicas(user.id);
        return NextResponse.json({ 
          replicas: allReplicas.allReplicas,
          stockReplicas: allReplicas.stockReplicas,
          userReplicas: allReplicas.userReplicas
        });
      } else {
        // Get only user replicas (existing behavior)
        const replicas = await tavusService.listReplicas(user.id);
        return NextResponse.json({ replicas });
      }
    } catch (dbError: unknown) {
      const error = dbError as { code?: string; message?: string };
      console.error('Error fetching replicas from database:', dbError);
      
      // Check if it's a table permission error
      if (error?.code === '42501') {
        return NextResponse.json({
          error: 'Database tables not properly set up. Please run the Tavus setup script.',
          details: 'The Tavus tables exist but lack proper permissions. Check the setup instructions.',
          setupRequired: true
        }, { status: 500 });
      }
      
      // Check if table doesn't exist
      if (error?.code === '42P01') {
        return NextResponse.json({
          error: 'Database tables not found. Please run the Tavus setup script.',
          details: 'The Tavus tables have not been created yet. Run the setup script in your Supabase dashboard.',
          setupRequired: true
        }, { status: 500 });
      }

      // If requesting stock replicas, try to return at least those
      if (includeStock) {
        try {
          const stockReplicas = await tavusService.getStockReplicas();
          return NextResponse.json({ 
            replicas: stockReplicas,
            stockReplicas: stockReplicas,
            userReplicas: [],
            warning: 'Could not connect to database. Showing only stock replicas.',
            dbError: error?.message
          });
        } catch (stockError) {
          console.error('Error fetching stock replicas:', stockError);
        }
      }

      // Fallback to empty array with warning
      console.warn('Database error, returning empty replicas array:', dbError);
      return NextResponse.json({ 
        replicas: [],
        warning: 'Could not connect to database. Some features may not work properly.',
        dbError: error?.message
      });
    }
  } catch (error) {
    console.error('Error in replicas API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { replica_name, training_video_url } = body;

    if (!replica_name || !training_video_url) {
      return NextResponse.json(
        { error: 'replica_name and training_video_url are required' },
        { status: 400 }
      );
    }

    // Initialize Tavus service
    const tavusService = new TavusService(supabase);
    
    try {
      const replica = await tavusService.createReplica(training_video_url, replica_name, user.id);

      return NextResponse.json({ replica });
    } catch (dbError: unknown) {
      const error = dbError as { code?: string; message?: string };
      console.error('Error creating replica in database:', dbError);
      
      // Check if it's a table permission error
      if (error?.code === '42501') {
        return NextResponse.json({
          error: 'Database tables not properly set up. Please run the Tavus setup script.',
          details: 'The Tavus tables exist but lack proper permissions. Check the setup instructions.',
          setupRequired: true
        }, { status: 500 });
      }
      
      // Check if table doesn't exist
      if (error?.code === '42P01') {
        return NextResponse.json({
          error: 'Database tables not found. Please run the Tavus setup script.',
          details: 'The Tavus tables have not been created yet. Run the setup script in your Supabase dashboard.',
          setupRequired: true
        }, { status: 500 });
      }

      // Re-throw other errors
      throw dbError;
    }
  } catch (error: unknown) {
    console.error('Error in replicas POST route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 