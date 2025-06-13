"use client";

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Facebook, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertCircle,
  Zap
} from 'lucide-react';
import { FacebookAdAccount } from '@/lib/types';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface SettingsDialogProps {
  adAccounts: FacebookAdAccount[];
  databaseError: string | null;
  onTavusConnectionChange?: () => void;
}

interface TavusConnection {
  id: string;
  user_id: string;
  api_key: string;
  is_connected: boolean;
  connection_status: 'pending' | 'connected' | 'disconnected' | 'error';
  error_message?: string;
  last_connected_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function FacebookSettingsDialog({ 
  adAccounts, 
  databaseError, 
  onTavusConnectionChange 
}: SettingsDialogProps) {
  // ============================================================================
  // State Management
  // ============================================================================

  const [open, setOpen] = useState(false);
  const [tavusConnection, setTavusConnection] = useState<TavusConnection | null>(null);
  const [tavusApiKey, setTavusApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loadingTavus, setLoadingTavus] = useState(false);
  const [connectingTavus, setConnectingTavus] = useState(false);
  const [disconnectingTavus, setDisconnectingTavus] = useState(false);
  const [tavusError, setTavusError] = useState<string | null>(null);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    if (open) {
      loadTavusConnection();
    }
  }, [open]);

  // ============================================================================
  // Tavus API Functions
  // ============================================================================

  const loadTavusConnection = async () => {
    setLoadingTavus(true);
    setTavusError(null);

    try {
      const response = await fetch('/api/tavus/connection');
      
      if (!response.ok) {
        if (response.status === 404) {
          // No connection exists yet
          setTavusConnection(null);
          return;
        }
        throw new Error(`Failed to load Tavus connection: ${response.statusText}`);
      }

      const data = await response.json();
      setTavusConnection(data.connection);
      
      if (data.connection?.api_key) {
        setTavusApiKey(data.connection.api_key);
      }

    } catch (error) {
      console.error('Error loading Tavus connection:', error);
      setTavusError(error instanceof Error ? error.message : 'Failed to load Tavus connection');
    } finally {
      setLoadingTavus(false);
    }
  };

  const connectTavus = async () => {
    if (!tavusApiKey.trim()) {
      setTavusError('Please enter your Tavus API key');
      return;
    }

    setConnectingTavus(true);
    setTavusError(null);

    try {
      const response = await fetch('/api/tavus/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: tavusApiKey.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect to Tavus');
      }

      const data = await response.json();
      setTavusConnection(data.connection);
      
      // Notify parent component of connection change
      if (onTavusConnectionChange) {
        onTavusConnectionChange();
      }

    } catch (error) {
      console.error('Error connecting to Tavus:', error);
      setTavusError(error instanceof Error ? error.message : 'Failed to connect to Tavus');
    } finally {
      setConnectingTavus(false);
    }
  };

  const disconnectTavus = async () => {
    setDisconnectingTavus(true);
    setTavusError(null);

    try {
      const response = await fetch('/api/tavus/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect from Tavus');
      }

      setTavusConnection(null);
      setTavusApiKey('');
      
      // Notify parent component of connection change
      if (onTavusConnectionChange) {
        onTavusConnectionChange();
      }

    } catch (error) {
      console.error('Error disconnecting from Tavus:', error);
      setTavusError(error instanceof Error ? error.message : 'Failed to disconnect from Tavus');
    } finally {
      setDisconnectingTavus(false);
    }
  };

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const getTavusStatusBadge = () => {
    if (!tavusConnection) {
      return <Badge variant="secondary">Not Connected</Badge>;
    }

    switch (tavusConnection.connection_status) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Connecting...
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case 'disconnected':
      default:
        return <Badge variant="secondary">Disconnected</Badge>;
    }
  };

  const getFacebookStatusBadge = () => {
    if (adAccounts.length === 0) {
      return <Badge variant="secondary">Not Connected</Badge>;
    }

    return (
      <Badge variant="default" className="bg-blue-600">
        <CheckCircle className="h-3 w-3 mr-1" />
        Connected ({adAccounts.length} account{adAccounts.length !== 1 ? 's' : ''})
      </Badge>
    );
  };

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderFacebookCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Facebook className="h-5 w-5 text-blue-600" />
          Facebook Ads Integration
        </CardTitle>
        <CardDescription>
          Manage your Facebook ad accounts and campaigns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Connection Status</Label>
          {getFacebookStatusBadge()}
        </div>

        {databaseError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{databaseError}</AlertDescription>
          </Alert>
        )}

        {adAccounts.length > 0 && (
          <div className="space-y-2">
            <Label>Connected Ad Accounts</Label>
            <div className="space-y-2">
              {adAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{account.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {account.account_id} • {account.currency}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {account.account_status === 1 ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Features</Label>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Create and manage campaigns</li>
            <li>• Monitor ad performance metrics</li>
            <li>• Real-time data synchronization</li>
            <li>• Advanced targeting options</li>
            <li>• Budget optimization tools</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {adAccounts.length === 0 ? (
          <Button className="flex items-center gap-2" asChild>
            <a href="/api/auth/facebook" target="_blank" rel="noopener noreferrer">
              <Facebook className="h-4 w-4" />
              Connect Facebook
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        ) : (
          <>
            <Button variant="outline" className="flex items-center gap-2" asChild>
              <a href="/facebook/settings" target="_blank" rel="noopener noreferrer">
                <Settings className="h-4 w-4" />
                Manage Settings
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
            <Button variant="destructive" className="flex items-center gap-2" asChild>
              <a href="/facebook/disconnect">
                Disconnect
              </a>
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );

  const renderTavusCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <Zap className="h-3 w-3 text-white" />
          </div>
          Tavus AI Integration
        </CardTitle>
        <CardDescription>
          Create AI-powered video avatars for lead nurturing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Connection Status</Label>
          {getTavusStatusBadge()}
        </div>

        {tavusError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{tavusError}</AlertDescription>
          </Alert>
        )}

        {tavusConnection?.error_message && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{tavusConnection.error_message}</AlertDescription>
          </Alert>
        )}

        {!tavusConnection?.is_connected && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="tavus-api-key">Tavus API Key</Label>
              <div className="relative">
                <Input
                  id="tavus-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={tavusApiKey}
                  onChange={(e) => setTavusApiKey(e.target.value)}
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
            <div className="text-sm text-muted-foreground">
              Get your API key from{' '}
              <a
                href="https://app.tavus.io/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Tavus Dashboard
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        {tavusConnection?.is_connected && (
          <div className="space-y-2">
            <Label>Last Connected</Label>
            <div className="text-sm text-muted-foreground">
              {tavusConnection.last_connected_at
                ? new Date(tavusConnection.last_connected_at).toLocaleString()
                : 'Never'
              }
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Features</Label>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Create custom AI avatars</li>
            <li>• Generate personalized videos</li>
            <li>• Automated lead follow-up sequences</li>
            <li>• Voice cloning and synthesis</li>
            <li>• Multi-language support</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {loadingTavus ? (
          <Button disabled className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </Button>
        ) : !tavusConnection?.is_connected ? (
          <Button
            onClick={connectTavus}
            disabled={connectingTavus || !tavusApiKey.trim()}
            className="flex items-center gap-2"
          >
            {connectingTavus ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {connectingTavus ? 'Connecting...' : 'Connect Tavus'}
          </Button>
        ) : (
          <>
            <Button variant="outline" className="flex items-center gap-2" asChild>
              <a href="https://app.tavus.io" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open Tavus Dashboard
              </a>
            </Button>
            <Button
              variant="destructive"
              onClick={disconnectTavus}
              disabled={disconnectingTavus}
              className="flex items-center gap-2"
            >
              {disconnectingTavus ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Disconnect'
              )}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Integration Settings</DialogTitle>
          <DialogDescription>
            Manage your Facebook Ads and Tavus AI integrations
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {renderFacebookCard()}
          {renderTavusCard()}
        </div>
      </DialogContent>
    </Dialog>
  );
}