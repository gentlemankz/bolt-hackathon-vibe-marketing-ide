"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { FacebookSettingsDialog } from "@/components/facebook/settings-dialog";
import { MarketingDashboard } from "@/components/facebook/marketing-dashboard";
import { FacebookAdAccount } from "@/lib/types";

interface DashboardClientProps {
  adAccounts: FacebookAdAccount[];
  databaseError: string | null;
}

export default function DashboardClient({ adAccounts, databaseError }: DashboardClientProps) {
  const [isChatOpen, setIsChatOpen] = useState(true); // Default to open
  const [refreshKey, setRefreshKey] = useState(0);
  
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const handleTavusConnectionChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Facebook Marketing</h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleChat}
            className={isChatOpen ? "bg-muted" : ""}
            title={isChatOpen ? "Close chat" : "Open chat"}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <FacebookSettingsDialog 
            adAccounts={adAccounts} 
            databaseError={databaseError} 
            onTavusConnectionChange={handleTavusConnectionChange}
          />
        </div>
      </div>
      
      {databaseError ? (
        <div className="p-6 border rounded-md bg-destructive/10 text-destructive">
          <h3 className="text-lg font-medium mb-2">Database Error</h3>
          <p>{databaseError}</p>
        </div>
      ) : (
        <MarketingDashboard 
          key={refreshKey}
          initialAdAccounts={adAccounts} 
          isChatOpen={isChatOpen}
        />
      )}
    </div>
  );
} 