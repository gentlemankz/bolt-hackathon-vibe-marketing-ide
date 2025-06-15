import { Metadata } from "next";
import { Suspense } from "react";
import { AdAccountSelector } from "@/components/facebook/business-selector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Select Facebook Ad Account",
  description: "Select which Facebook Ad Account you want to connect.",
};

function SuccessMessage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const success = searchParams.success;
  const warning = searchParams.warning;
  const warningDescription = searchParams.warning_description;

  if (success === 'facebook_connected') {
    return (
      <Alert className="mb-6 border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Facebook account connected successfully! Please select an ad account to continue.
        </AlertDescription>
      </Alert>
    );
  }

  if (warning === 'limited_permissions') {
    return (
      <Alert className="mb-6 border-yellow-200 bg-yellow-50">
        <AlertDescription className="text-yellow-800">
          {warningDescription || 'Limited permissions detected. Some features may not work properly.'}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

export default function SelectAdAccountPage({ 
  searchParams 
}: { 
  searchParams: { [key: string]: string | string[] | undefined } 
}) {
  return (
    <div className="container mx-auto py-12">
      <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Select an Ad Account</h1>
          <p className="text-muted-foreground mt-2">
            Choose which Facebook Ad Account you want to connect to access campaigns, ad sets, and ads.
          </p>
        </div>

        <Suspense fallback={null}>
          <SuccessMessage searchParams={searchParams} />
        </Suspense>

        <AdAccountSelector />
      </div>
    </div>
  );
} 