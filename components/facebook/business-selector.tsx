"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
  amount_spent?: string;
  balance?: string;
  currency?: string;
  isConnected: boolean;
}

type ApiError = {
  error: string;
};

export function AdAccountSelector() {
  const router = useRouter();
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAdAccountId, setSelectedAdAccountId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdAccounts();
  }, []);

  const fetchAdAccounts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/facebook/ad-accounts");
      
      if (!response.ok) {
        const errorData = await response.json() as ApiError;
        throw new Error(errorData.error || "Failed to fetch ad accounts");
      }
      
      const data = await response.json();
      setAdAccounts(data.adAccounts || []);
      
      // Auto-select the first non-connected account if any
      const nonConnectedAccount = data.adAccounts?.find((account: AdAccount) => !account.isConnected);
      if (nonConnectedAccount) {
        setSelectedAdAccountId(nonConnectedAccount.id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch ad accounts";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedAdAccountId) {
      setError("Please select an ad account");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      const response = await fetch("/api/facebook/connect-adaccount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adAccountId: selectedAdAccountId }),
      });

      if (!response.ok) {
        const errorData = await response.json() as ApiError;
        throw new Error(errorData.error || "Failed to connect ad account");
      }

      // Redirect to dashboard or reload the ad accounts
      router.push("/dashboard");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to connect ad account";
      setError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const getAccountStatusText = (status: number): string => {
    switch (status) {
      case 1:
        return "Active";
      case 2:
        return "Disabled";
      case 3:
        return "Unsettled";
      case 7:
        return "Pending Review";
      case 8:
        return "Pending Closure";
      case 9:
        return "Closed";
      case 100:
        return "Pending Risk Review";
      case 101:
        return "Pending Settlement";
      default:
        return `Status: ${status}`;
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Loading Ad Accounts</CardTitle>
          <CardDescription>Please wait while we fetch your ad accounts...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent"></div>
        </CardContent>
      </Card>
    );
  }

  if (adAccounts.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>No Ad Accounts Found</CardTitle>
          <CardDescription>
            You don&apos;t have any ad accounts associated with your Facebook account.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="w-full"
          >
            Return to Dashboard
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Select an Ad Account</CardTitle>
        <CardDescription>
          Choose the ad account you want to connect to access campaigns, ad sets, and ads.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <RadioGroup
          value={selectedAdAccountId}
          onValueChange={setSelectedAdAccountId}
          className="space-y-3"
        >
          {adAccounts.map((account) => (
            <div
              key={account.id}
              className={`flex items-center space-x-2 rounded-md border p-3 ${
                account.isConnected ? "border-green-500 bg-green-50" : ""
              }`}
            >
              <RadioGroupItem
                value={account.id}
                id={account.id}
                disabled={account.isConnected}
              />
              <Label htmlFor={account.id} className="flex-1 cursor-pointer">
                <div className="font-medium">{account.name}</div>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div>ID: {account.account_id}</div>
                  <div>Status: {getAccountStatusText(account.account_status)}</div>
                  {account.isConnected && <div className="text-green-600 font-medium">Already connected</div>}
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          className="w-full sm:w-auto"
          disabled={isConnecting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConnect}
          className="w-full sm:w-auto"
          disabled={isConnecting || !selectedAdAccountId || adAccounts.every(a => a.isConnected)}
        >
          {isConnecting ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Connecting...
            </>
          ) : (
            "Connect Ad Account"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 