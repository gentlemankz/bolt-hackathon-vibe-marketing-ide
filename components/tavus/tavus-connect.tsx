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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setApiKey("");
        onConnectionSuccess?.();
      } else {
        setError(data.error || 'Failed to connect to Tavus');
      }
    } catch {
      setError('Failed to connect to Tavus');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">AI Avatar Constructor</h2>
          <p className="text-muted-foreground">
            Connect your Tavus account to start creating AI avatars for lead nurturing and customer engagement.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-white" />
            </div>
            <CardTitle>Connect to Tavus AI</CardTitle>
            <CardDescription>
              Enter your Tavus API key to unlock powerful AI avatar creation capabilities
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-3">
              <Label htmlFor="tavus-api-key">Tavus API Key</Label>
              <div className="relative">
                <Input
                  id="tavus-api-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="Enter your Tavus API key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
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
            
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="text-sm">
                <p className="font-medium mb-2">How to get your API key:</p>
                <ol className="text-xs space-y-1 text-muted-foreground list-decimal ml-4">
                  <li>Sign up or log in to your Tavus account</li>
                  <li>Navigate to the API section in your dashboard</li>
                  <li>Generate a new API key</li>
                  <li>Copy and paste it here</li>
                </ol>
                <div className="mt-3">
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                    <a 
                      href="https://app.tavus.io/api-keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1"
                    >
                      Get API Key
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-sm">
                <p className="font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  What you&apos;ll get access to:
                </p>
                <ul className="text-xs space-y-1 text-muted-foreground list-disc ml-4">
                  <li>Create custom AI replicas from your training videos</li>
                  <li>Access 250+ professional stock avatar templates</li>
                  <li>Generate personalized videos with custom scripts</li>
                  <li>Download and share videos for lead nurturing</li>
                  <li>Real-time conversational AI capabilities</li>
                </ul>
              </div>
            </div>
            
            <Button 
              onClick={handleConnect}
              disabled={!apiKey.trim() || isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? "Connecting..." : "Connect Tavus Account"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 