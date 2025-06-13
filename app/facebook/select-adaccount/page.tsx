import { Metadata } from "next";
import { AdAccountSelector } from "@/components/facebook/business-selector";

export const metadata: Metadata = {
  title: "Select Facebook Ad Account",
  description: "Select which Facebook Ad Account you want to connect.",
};

export default function SelectAdAccountPage() {
  return (
    <div className="container mx-auto py-12">
      <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Select an Ad Account</h1>
          <p className="text-muted-foreground mt-2">
            Choose which Facebook Ad Account you want to connect to access campaigns, ad sets, and ads.
          </p>
        </div>

        <AdAccountSelector />
      </div>
    </div>
  );
} 