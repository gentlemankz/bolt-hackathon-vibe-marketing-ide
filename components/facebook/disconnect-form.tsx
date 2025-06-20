"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Facebook, AlertTriangle, CheckCircle } from "lucide-react";

export function DisconnectFacebookForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  
  const handleDisconnect = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await fetch("/api/facebook/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to disconnect account");
      }
      
      // Show success message briefly before redirecting
      setSuccess(true);
      
      // Redirect to dashboard after successful disconnection
      setTimeout(() => {
        router.push("/dashboard?success=disconnected");
      }, 1500);
    } catch (error) {
      console.error('Disconnect error:', error);
      setError(error instanceof Error ? error.message : "An error occurred while disconnecting your account");
      setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    router.push("/dashboard");
  };
  
  if (success) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle>Successfully Disconnected</CardTitle>
          </div>
          <CardDescription>
            Your Facebook account has been disconnected and all data has been cleared.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Redirecting you to the dashboard...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Facebook className="h-5 w-5 text-blue-600" />
          <CardTitle>Disconnect Facebook Account</CardTitle>
        </div>
        <CardDescription>
          This will disconnect your Facebook account and remove all related data.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This action will permanently delete all your Facebook ad accounts, campaigns, and metrics data from our system.
          </AlertDescription>
        </Alert>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="text-sm text-muted-foreground">
          <p>The following data will be deleted:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>All connected Facebook ad accounts</li>
            <li>Campaign data and metrics</li>
            <li>Ad sets and ads information</li>
            <li>Sync jobs and historical data</li>
            <li>Authentication tokens</li>
          </ul>
          <p className="mt-4">You can reconnect your Facebook account at any time, but you&apos;ll need to set up your ad accounts again.</p>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handleCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button 
          variant="destructive" 
          onClick={handleDisconnect}
          disabled={isLoading}
        >
          {isLoading ? "Disconnecting..." : "Confirm Disconnect"}
        </Button>
      </CardFooter>
    </Card>
  );
} 