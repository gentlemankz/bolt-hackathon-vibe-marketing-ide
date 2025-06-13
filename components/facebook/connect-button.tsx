"use client";

import { Button } from "@/components/ui/button";
import { Facebook } from "lucide-react";
import { getFacebookOAuthUrl } from "@/lib/meta-api";
import { ButtonProps } from "@/components/ui/button";
import React from "react";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface FacebookConnectButtonProps extends ButtonProps {
  children?: React.ReactNode;
  requiresReconnect?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function FacebookConnectButton({
  children,
  className,
  requiresReconnect = false,
  onClick,
  ...props
}: FacebookConnectButtonProps) {
  const handleConnect = (e: React.MouseEvent<HTMLButtonElement>) => {
    // First call any provided onClick handler
    if (onClick) {
      onClick(e);
    }
    
    // Then redirect to Facebook OAuth URL
    window.location.href = getFacebookOAuthUrl();
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleConnect}
        className={className}
        {...props}
      >
        <Facebook className="mr-2 h-4 w-4" />
        {children || (requiresReconnect ? "Reconnect Facebook" : "Connect with Facebook")}
      </Button>
      
      {requiresReconnect && (
        <p className="text-xs text-muted-foreground text-center">
          We need additional permissions for metrics data. Please reconnect your account.
        </p>
      )}
      
      <p className="text-xs text-muted-foreground text-center">
        This app will request permission to access your Facebook ad accounts, campaigns, and metrics
      </p>
    </div>
  );
}