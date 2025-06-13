import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { DisconnectFacebookForm } from '@/components/facebook/disconnect-form';

export const metadata: Metadata = {
  title: 'Disconnect Facebook Account',
  description: 'Disconnect your Facebook account and clear data',
};

export default async function DisconnectFacebookPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/sign-in');
  }
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Disconnect Facebook Account</h1>
      
      <div className="max-w-md mx-auto">
        <DisconnectFacebookForm />
      </div>
    </div>
  );
} 