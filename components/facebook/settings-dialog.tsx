"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Facebook, Eye, EyeOff, ExternalLink, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FacebookAdAccount, TavusConnection } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { FacebookConnectButton } from "@/components/facebook/connect-button";

interface SettingsDialogProps {
  adAccounts: FacebookAdAccount[];
  databaseError: string | null;
  onTavusConnectionChange?: () => void;
}

export function FacebookSettingsDialog({ adAccounts, databaseError, onTavusConnectionChange }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [tavusConnection, setTavusConnection] = useState<TavusConnection | null>(null);
  const [tavusApiKey, setTavusApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConnectingTavus, setIsConnectingTavus] = useState(false);
  const [tavusError, setTavusError] = useState<string | null>(null);
  
  const hasConnectedFacebook = adAccounts.length > 0;
  const isTavusConnected = tavusConnection?.is_connected && tavusConnection?.connection_status === 'connected';
  
  // Load Tavus connection status
  useEffect(() => {
    const loadTavusConnection = async () => {
      try {
        const response = await fetch('/api/tavus/connection');
        if (response.ok) {
          const data = await response.json();
          setTavusConnection(data.connection);
        } else {
          setTavusError('Failed to load Tavus connection status');
        }
      } catch {
        setTavusError('Failed to load Tavus connection status');
      }
    };

    if (open) {
      loadTavusConnection();
    }
  }, [open]);

  const handleTavusConnect = async () => {
    if (!tavusApiKey.trim()) return;
    
    setIsConnectingTavus(true);
    setTavusError(null);
    
    try {
      const response = await fetch('/api/tavus/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: tavusApiKey.trim() }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setTavusConnection(data.connection);
        setTavusApiKey("");
        onTavusConnectionChange?.();
      } else {
        setTavusError(data.error || 'Failed to connect to Tavus');
      }
    } catch {
      setTavusError('Failed to connect to Tavus');
    } finally {
      setIsConnectingTavus(false);
    }
  };

  const handleTavusDisconnect = async () => {
    setIsConnectingTavus(true);
    setTavusError(null);
    
    try {
      const response = await fetch('/api/tavus/connection', {
        method: 'DELETE',
      });

      if (response.ok) {
        setTavusConnection(prev => prev ? { ...prev, is_connected: false, connection_status: 'disconnected' } : null);
        onTavusConnectionChange?.();
      } else {
        const data = await response.json();
        setTavusError(data.error || 'Failed to disconnect from Tavus');
      }
    } catch {
      setTavusError('Failed to disconnect from Tavus');
    } finally {
      setIsConnectingTavus(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
          <DialogDescription>
            Manage your connected services and integrations.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          {databaseError && (
            <Alert variant="destructive">
              <AlertDescription>
                {databaseError}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Facebook Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Facebook className="h-5 w-5 text-blue-600" />
                <CardTitle>Facebook Ads</CardTitle>
              </div>
              <CardDescription>
                Manage your Facebook ad accounts, campaigns, and ads.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {databaseError ? (
                <div className="text-sm text-muted-foreground">
                  Database tables are not set up. Please run the SQL schema file to create the required tables.
                </div>
              ) : hasConnectedFacebook ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Connected</span>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Connected Ad Accounts:</p>
                    <ul className="text-sm space-y-1">
                      {adAccounts.map((account) => (
                        <li key={account.id} className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <span>{account.name} ({account.account_id})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    No connected Facebook ad accounts. Connect your account to access campaigns and ads.
                  </div>
                  
                  <div className="w-full bg-card rounded-lg">
                    <div className="text-center space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          By connecting your Facebook ads account, you will be able to:
                        </p>
                        <ul className="text-sm text-left list-disc pl-5 space-y-1">
                          <li>Access your ad accounts</li>
                          <li>View your campaigns</li>
                          <li>Manage ad sets and ads</li>
                          <li>Get performance insights</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            
            <CardFooter>
              {hasConnectedFacebook ? (
                <div className="grid grid-cols-3 gap-2 w-full">
                  <Button variant="outline" asChild onClick={() => setOpen(false)}>
                    <Link href="/facebook/select-adaccount">
                      Connect More
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Close
                  </Button>
                  <Button variant="destructive" asChild onClick={() => setOpen(false)}>
                    <Link href="/facebook/disconnect">
                      Disconnect
                    </Link>
                  </Button>
                </div>
              ) : (
                <FacebookConnectButton 
                  className="w-full" 
                  onClick={() => setOpen(false)}
                />
              )}
            </CardFooter>
          </Card>

          {/* Tavus AI Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-blue-500 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-xs">T</span>
                </div>
                <CardTitle>Tavus AI</CardTitle>
              </div>
              <CardDescription>
                Connect your Tavus account to access AI avatar creation and video generation.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {tavusError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    {tavusError}
                  </AlertDescription>
                </Alert>
              )}
              
              {isTavusConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Connected</span>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Account Status:</p>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span>API Key Active</span>
                      </div>
                      {tavusConnection?.last_connected_at && (
                        <div className="text-xs text-muted-foreground">
                          Last connected: {new Date(tavusConnection.last_connected_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm">
                      <p className="font-medium mb-1">Available Features:</p>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Create custom AI replicas</li>
                        <li>• Access 250+ stock avatar templates</li>
                        <li>• Generate personalized videos</li>
                        <li>• Download and share videos</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Connect your Tavus account to start creating AI avatar videos.
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="tavus-api-key">Tavus API Key</Label>
                      <div className="relative">
                        <Input
                          id="tavus-api-key"
                          type={showApiKey ? "text" : "password"}
                          placeholder="Enter your Tavus API key..."
                          value={tavusApiKey}
                          onChange={(e) => setTavusApiKey(e.target.value)}
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
                    
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="text-sm">
                        <p className="font-medium mb-2">How to get your API key:</p>
                        <ol className="text-xs space-y-1 text-muted-foreground list-decimal ml-4">
                          <li>Sign up or log in to your Tavus account</li>
                          <li>Navigate to the API section in your dashboard</li>
                          <li>Generate a new API key</li>
                          <li>Copy and paste it here</li>
                        </ol>
                        <div className="mt-2">
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
                  </div>
                </div>
              )}
            </CardContent>
            
            <CardFooter>
              {isTavusConnected ? (
                <div className="flex gap-2 w-full">
                  <Button 
                    variant="outline" 
                    onClick={() => setOpen(false)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleTavusDisconnect}
                    disabled={isConnectingTavus}
                    className="flex-1"
                  >
                    {isConnectingTavus ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleTavusConnect}
                  disabled={!tavusApiKey.trim() || isConnectingTavus}
                  className="w-full"
                >
                  {isConnectingTavus ? "Connecting..." : "Connect Tavus"}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
} 