"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, ExternalLink, CheckCircle, Users } from "lucide-react";

interface TavusConnectProps {
  onConnectionSuccess?: () => void;
}

export function TavusConnect({ onConnectionSuccess }: TavusConnectProps) {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError("Please enter your Tavus API key");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetch('/api/tavus/connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect to Tavus');
      }

      const data = await response.json();
      
      if (onConnectionSuccess) {
        onConnectionSuccess();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Tavus');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Connect to Tavus</h1>
        <p className="text-muted-foreground mt-2">
          Connect your Tavus account to create AI-powered video avatars
        </p>
      </div>

      <div className="flex justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-white" />
            </div>
            <CardTitle>Connect Your Tavus Account</CardTitle>
            <CardDescription>
              Enter your Tavus API key to get started with AI avatar creation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="api-key">Tavus API Key</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Tavus API key"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">How to get your API key:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Visit the <Button variant="link" size="sm" className="p-0 h-auto text-blue-600" asChild>
                    <a href="https://app.tavus.io/api-keys" target="_blank" rel="noopener noreferrer">
                      Tavus Dashboard <ExternalLink className="h-3 w-3 ml-1 inline" />
                    </a>
                  </Button></li>
                  <li>Sign in to your account or create a new one</li>
                  <li>Navigate to API Keys section</li>
                  <li>Generate a new API key</li>
                  <li>Copy and paste it here</li>
                </ol>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  What you'll get access to:
                </h4>
                <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                  <li>Create custom AI avatars from your videos</li>
                  <li>Generate personalized video messages</li>
                  <li>Access to stock avatar library</li>
                  <li>Advanced voice cloning capabilities</li>
                  <li>Multi-language support</li>
                  <li>Real-time video generation</li>
                </ul>
              </div>
            </div>

            <Button
              onClick={handleConnect}
              disabled={isConnecting || !apiKey.trim()}
              className="w-full"
            >
              {isConnecting ? "Connecting..." : "Connect to Tavus"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}