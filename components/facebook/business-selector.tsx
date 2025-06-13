"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
  amount_spent: string;
  balance: string;
  currency: string;
  business_city: string;
  business_country_code: string;
  owner: string;
  age: string;
  is_connected?: boolean;
}

interface ApiError {
  message: string;
  code?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export default function AdAccountSelector() {
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch ad accounts on component mount
  useEffect(() => {
    fetchAdAccounts();
  }, []);

  // Auto-select first non-connected account
  useEffect(() => {
    if (adAccounts.length > 0 && !selectedAccountId) {
      const firstNonConnected = adAccounts.find(account => !account.is_connected);
      if (firstNonConnected) {
        setSelectedAccountId(firstNonConnected.id);
      } else {
        setSelectedAccountId(adAccounts[0].id);
      }
    }
  }, [adAccounts, selectedAccountId]);

  const fetchAdAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/facebook/ad-accounts');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch ad accounts');
      }

      const data = await response.json();
      setAdAccounts(data.adAccounts || []);
    } catch (err) {
      const error = err as ApiError;
      setError(error.message || 'Failed to load ad accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedAccountId) return;

    try {
      setConnecting(true);
      setError(null);

      const response = await fetch('/api/facebook/ad-accounts/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adAccountId: selectedAccountId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect ad account');
      }

      // Redirect to dashboard on success
      router.push('/dashboard');
    } catch (err) {
      const error = err as ApiError;
      setError(error.message || 'Failed to connect ad account');
    } finally {
      setConnecting(false);
    }
  };

  const getAccountStatusText = (status: number): string => {
    const statusMap: Record<number, string> = {
      1: 'ACTIVE',
      2: 'DISABLED',
      3: 'UNSETTLED',
      7: 'PENDING_RISK_REVIEW',
      9: 'PENDING_SETTLEMENT',
      100: 'PENDING_CLOSURE',
      101: 'CLOSED',
      201: 'ANY_ACTIVE',
      202: 'ANY_CLOSED',
    };
    return statusMap[status] || 'UNKNOWN';
  };

  // Loading state
  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Loading Ad Accounts</CardTitle>
          <CardDescription>
            Please wait while we fetch your Facebook ad accounts...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (adAccounts.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>No Ad Accounts Found</CardTitle>
          <CardDescription>
            We couldn't find any Facebook ad accounts associated with your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Make sure you have access to at least one Facebook ad account and try again.
          </p>
          <Button onClick={fetchAdAccounts} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Select Ad Account</CardTitle>
        <CardDescription>
          Choose the Facebook ad account you want to connect and manage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <RadioGroup
          value={selectedAccountId}
          onValueChange={setSelectedAccountId}
          className="space-y-3"
        >
          {adAccounts.map((account) => (
            <div
              key={account.id}
              className={`flex items-center space-x-3 rounded-lg border p-4 ${
                selectedAccountId === account.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              } ${account.is_connected ? 'opacity-60' : ''}`}
            >
              <RadioGroupItem
                value={account.id}
                id={account.id}
                disabled={account.is_connected}
              />
              <Label
                htmlFor={account.id}
                className="flex-1 cursor-pointer space-y-1"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="font-medium">{account.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {account.account_id}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Status: {getAccountStatusText(account.account_status)} • {account.currency}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      Balance: {parseFloat(account.balance).toLocaleString()} {account.currency}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Spent: {parseFloat(account.amount_spent).toLocaleString()} {account.currency}
                    </div>
                  </div>
                </div>
                {account.is_connected && (
                  <div className="text-xs text-green-600 font-medium">
                    ✓ Already Connected
                  </div>
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={fetchAdAccounts}
          disabled={connecting}
        >
          Refresh
        </Button>
        <Button
          onClick={handleConnect}
          disabled={!selectedAccountId || connecting || adAccounts.find(a => a.id === selectedAccountId)?.is_connected}
          className="flex items-center gap-2"
        >
          {connecting && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          )}
          {connecting ? 'Connecting...' : 'Connect Account'}
        </Button>
      </CardFooter>
    </Card>
  );
}