"use client";

import { ReactNode } from "react";
import { ChatInterface } from "@/components/ai/chat-interface";
import { ContextData, TaggedFile } from "@/lib/ai-api-client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface DashboardLayoutProps {
  sidebarContent: ReactNode;
  mainContent: ReactNode;
  isChatOpen: boolean;
  context?: ContextData;
  taggedFiles?: TaggedFile[];
  onTaggedFilesChange?: (files: TaggedFile[]) => void;
  contextSummary?: {
    accountsCount: number;
    campaignsCount: number;
    adsetsCount: number;
    adsCount: number;
    currentView: string;
    timeRange: string;
    description: string;
  };
  getAllMentionableItems?: () => Array<{
    id: string;
    name: string;
    type: 'account' | 'campaign' | 'adset' | 'ad';
    parentName?: string;
  }>;
}

// ============================================================================
// Main Component
// ============================================================================

export function DashboardLayout({
  sidebarContent,
  mainContent,
  isChatOpen,
  context,
  taggedFiles,
  onTaggedFilesChange,
  contextSummary,
  getAllMentionableItems
}: DashboardLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-10rem)] border rounded-md overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-64 border-r bg-muted/10 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Facebook Marketing</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sidebarContent}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {mainContent}
      </div>

      {/* Right Chat Panel */}
      {isChatOpen && (
        <div className="w-80 border-l bg-background transition-all duration-300 ease-in-out">
          <ChatInterface
            className="h-full"
            context={context}
            taggedFiles={taggedFiles}
            onTaggedFilesChange={onTaggedFilesChange}
            contextSummary={contextSummary}
            getAllMentionableItems={getAllMentionableItems}
          />
        </div>
      )}
    </div>
  );
}