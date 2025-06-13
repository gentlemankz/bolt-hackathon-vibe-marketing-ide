import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TavusService } from '@/lib/services/tavus-service';

export async function GET() {
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
    
    try {
      console.log('Fetching stock replicas...');
      const stockReplicas = await tavusService.getStockReplicas();
      
      console.log(`Found ${stockReplicas.length} stock replicas`);
      
      return NextResponse.json({ 
        replicas: stockReplicas,
        count: stockReplicas.length,
        message: stockReplicas.length > 0 
          ? `Successfully loaded ${stockReplicas.length} stock replicas`
          : 'No stock replicas available - using fallback templates'
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Error fetching stock replicas:', error);
      return NextResponse.json({
        error: 'Failed to fetch stock replicas',
        details: err.message,
        fallbackAvailable: true
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in stock replicas API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 