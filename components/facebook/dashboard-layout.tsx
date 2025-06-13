"use client";

import { ReactNode } from "react";
import { ChatInterface } from "@/components/ai/chat-interface";
import { ContextData, TaggedFile } from "@/lib/ai-api-client";

interface DashboardLayoutProps {
  sidebarContent: ReactNode;
  mainContent: ReactNode;
  isChatOpen: boolean;
  context?: ContextData;
  taggedFiles?: TaggedFile[];
  onTaggedFilesChange?: (files: TaggedFile[]) => void;
  contextSummary?: {
    description: string;
    accounts: number;
    campaigns: number;
    adSets: number;
    ads: number;
    selectedType: string | null;
    selectedName: string | null;
  };
  getAllMentionableItems?: () => Array<{
    id: string;
    name: string;
    type: 'account' | 'campaign' | 'adset' | 'ad';
    parentName?: string;
  }>;
}

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
      {/* Left sidebar */}
      <div className="w-64 bg-muted/40 border-r overflow-y-auto">
        <div className="p-2">
          <h3 className="font-medium text-sm mb-2 px-2">Facebook Marketing</h3>
          {sidebarContent}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {mainContent}
        </div>
      </div>

      {/* Right chat panel - togglable */}
      <div className={`border-l transition-all duration-300 ${isChatOpen ? 'w-80' : 'w-0 border-l-0'}`}>
        {isChatOpen && (
          <ChatInterface
            context={context}
            taggedFiles={taggedFiles}
            onTaggedFilesChange={onTaggedFilesChange}
            contextSummary={contextSummary}
            getAllMentionableItems={getAllMentionableItems}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
} 