"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Facebook, AlertTriangle } from "lucide-react";

// ============================================================================
// Main Component
// ============================================================================

export function DisconnectFacebookForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDisconnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/facebook/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to disconnect Facebook account");
      }

      // Redirect to dashboard with success message
      router.push("/dashboard?success=disconnected");
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to disconnect Facebook account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard");
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Facebook className="h-6 w-6" />
          <div>
            <CardTitle>Disconnect Facebook Account</CardTitle>
            <CardDescription>
              Remove your Facebook connection and delete all associated data
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This action cannot be undone. All your Facebook data will be permanently deleted.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Disconnecting your Facebook account will permanently delete the following data:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
            <li>All connected Facebook ad accounts</li>
            <li>Campaign data and configurations</li>
            <li>Ad set targeting and budget information</li>
            <li>Individual ad creatives and performance data</li>
            <li>Historical metrics and analytics</li>
            <li>Sync job history and logs</li>
            <li>Your Facebook access token</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            You will need to reconnect your Facebook account to access these features again.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-3">
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
          {isLoading ? "Disconnecting..." : "Disconnect Facebook"}
        </Button>
      </CardFooter>
    </Card>
  );
}