"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Tag, 
  X,
  BarChart3,
  AlertCircle,
  TrendingUp,
  Target,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIApiClient, ChatMessage, ContextData, TaggedFile } from '@/lib/ai-api-client';

interface ChatInterfaceProps {
  context?: ContextData;
  taggedFiles?: TaggedFile[];
  onTaggedFilesChange?: (files: TaggedFile[]) => void;
  className?: string;
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

interface MentionItem {
  id: string;
  name: string;
  type: 'account' | 'campaign' | 'adset' | 'ad';
  parentName?: string;
}

export function ChatInterface({ 
  context, 
  taggedFiles = [], 
  onTaggedFilesChange,
  className,
  contextSummary: propContextSummary = {
    description: 'Marketing Overview',
    accounts: 0,
    campaigns: 0,
    adSets: 0,
    ads: 0,
    selectedType: null,
    selectedName: null,
  },
  getAllMentionableItems = () => []
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const apiClient = new AIApiClient();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const removeTaggedFile = (id: string, type: string) => {
    if (onTaggedFilesChange) {
      const updatedFiles = taggedFiles.filter(file => !(file.id === id && file.type === type));
      onTaggedFilesChange(updatedFiles);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get filtered mentionable items based on query
  const getFilteredMentions = () => {
    const allItems = getAllMentionableItems();
    if (!mentionQuery) return allItems.slice(0, 10);
    
    return allItems.filter(item => 
      item.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      (item.parentName && item.parentName.toLowerCase().includes(mentionQuery.toLowerCase()))
    ).slice(0, 10);
  };

  // Handle input change and @ mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    setInput(value);
    
    // Check for @ mention
    const beforeCursor = value.substring(0, cursorPosition);
    const atIndex = beforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const afterAt = beforeCursor.substring(atIndex + 1);
      if (!afterAt.includes(' ') && afterAt.length >= 0) {
        setShowMentions(true);
        setMentionQuery(afterAt);
        setMentionPosition(atIndex);
        setSelectedMentionIndex(0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Handle mention selection
  const selectMention = (mention: MentionItem) => {
    const beforeMention = input.substring(0, mentionPosition);
    const afterMention = input.substring(mentionPosition + mentionQuery.length + 1);
    const mentionText = `@${mention.name}`;
    
    setInput(beforeMention + mentionText + afterMention);
    setShowMentions(false);
    setMentionQuery('');
    
    // Automatically add the mentioned item to tagged files
    if (onTaggedFilesChange) {
      // Find the full data for this mention from context
      let mentionData = null;
      
      if (context) {
        if (mention.type === 'account' && context.ad_accounts) {
          mentionData = context.ad_accounts.find(item => item.id === mention.id);
        } else if (mention.type === 'campaign' && context.campaigns) {
          mentionData = context.campaigns.find(item => item.id === mention.id);
        } else if (mention.type === 'adset' && context.adsets) {
          mentionData = context.adsets.find(item => item.id === mention.id);
        } else if (mention.type === 'ad' && context.ads) {
          mentionData = context.ads.find(item => item.id === mention.id);
        }
      }
      
      // Create tagged file entry
      if (mentionData) {
        const taggedFile: TaggedFile = {
          id: mention.id,
          name: mention.name,
          type: mention.type,
          content: mentionData,
          metadata: {
            mentionedAt: new Date().toISOString(),
            parentName: mention.parentName,
            autoTagged: true
          },
          created_at: new Date(),
        };
        
        // Add to tagged files if not already present
        const isAlreadyTagged = taggedFiles.some(file => file.id === mention.id && file.type === mention.type);
        if (!isAlreadyTagged) {
          onTaggedFilesChange([...taggedFiles, taggedFile]);
        }
      }
    }
    
    // Focus back to input
    setTimeout(() => {
      inputRef.current?.focus();
      const newPosition = beforeMention.length + mentionText.length;
      inputRef.current?.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Handle keyboard navigation for mentions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions) {
      const filteredMentions = getFilteredMentions();
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredMentions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredMentions.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredMentions[selectedMentionIndex]) {
          selectMention(filteredMentions[selectedMentionIndex]);
        }
        return;
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    }
    
    if (e.key === 'Enter' && !showMentions) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    setStatus('');

    try {
      setStatus('Sending message...');
      
      const response = await apiClient.chat({
        message: input,
        thread_id: threadId,
        context: context,
        tagged_files: taggedFiles,
      });

      if (response.thread_id && !threadId) {
        setThreadId(response.thread_id);
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setStatus('');
    } catch (error) {
      console.error('Chat error:', error);
      setError('Failed to send message. Please try again.');
      setStatus('');
    } finally {
      setIsLoading(false);
    }
  };

  // Use the prop contextSummary directly

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'account': return '🏢';
      case 'campaign': return '📊';
      case 'adset': return '🎯';
      case 'ad': return '📱';
      default: return '📄';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'account': return 'bg-blue-100 text-blue-800';
      case 'campaign': return 'bg-green-100 text-green-800';
      case 'adset': return 'bg-yellow-100 text-yellow-800';
      case 'ad': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const quickSuggestions = [
    { text: "What&apos;s my best performing campaign?", icon: TrendingUp },
    { text: "Show me CTR trends", icon: BarChart3 },
    { text: "Analyze my ad spend efficiency", icon: DollarSign },
    { text: "Compare campaign performance", icon: Target },
  ];

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header with context info */}
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Marketing Assistant
          </h3>
          {threadId && (
            <Badge variant="outline" className="text-xs">
              Thread: {threadId.slice(0, 8)}...
            </Badge>
          )}
        </div>
        
        {/* Context Summary */}
        {propContextSummary && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BarChart3 className="h-3 w-3" />
            <span>Context: {propContextSummary.description}</span>
            {propContextSummary.campaigns > 0 && <span>{propContextSummary.campaigns} campaigns</span>}
            {propContextSummary.adSets > 0 && <span>{propContextSummary.adSets} ad sets</span>}
            {propContextSummary.ads > 0 && <span>{propContextSummary.ads} ads</span>}
            {context?.current_view && (
              <Badge variant="outline" className="text-xs">
                {context.current_view}
              </Badge>
            )}
          </div>
        )}

        {/* Tagged Files */}
        {taggedFiles.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Tag className="h-3 w-3" />
              <span>Tagged items ({taggedFiles.length}):</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {taggedFiles.map((file) => (
                <Badge 
                  key={`${file.type}-${file.id}`} 
                  variant="secondary" 
                  className="text-xs flex items-center gap-1"
                >
                  <span>{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeTaggedFile(file.id, file.type)}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-2">AI Marketing Assistant</h3>
              <p className="text-sm">
                Ask me anything about your marketing data! I can analyze campaigns, 
                provide insights, and help optimize your performance.
              </p>
              {propContextSummary && (
                <div className="mt-4 text-xs">
                  <p>I have access to your current data:</p>
                  <div className="flex justify-center gap-4 mt-2">
                    {propContextSummary.campaigns > 0 && <span>📊 {propContextSummary.campaigns} campaigns</span>}
                    {propContextSummary.adSets > 0 && <span>🎯 {propContextSummary.adSets} ad sets</span>}
                    {propContextSummary.ads > 0 && <span>📱 {propContextSummary.ads} ads</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2",
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <div className="whitespace-pre-wrap text-sm">
                  {message.content}
                </div>
                {message.timestamp && (
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Status indicator */}
          {status && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{status}</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your marketing data... (use @ to mention items)"
              disabled={isLoading}
              className="pr-12"
            />
            {input && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <span className="text-xs text-gray-400">
                  {input.includes('@') ? '@ mention' : 'Enter to send'}
                </span>
              </div>
            )}
          </div>
          <Button 
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Quick suggestions */}
        {messages.length === 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {quickSuggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="text-xs h-6"
                onClick={() => setInput(suggestion.text)}
                disabled={isLoading}
              >
                <suggestion.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-sm">{suggestion.text}</span>
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Mention Dropdown */}
      {showMentions && (
        <div className="absolute bottom-20 left-4 right-4 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
          <div className="p-2 border-b bg-gray-50">
            <p className="text-xs font-medium text-gray-600">Mention items:</p>
          </div>
          {getFilteredMentions().map((mention, index) => (
            <div
              key={mention.id}
              className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                index === selectedMentionIndex ? 'bg-blue-50' : ''
              }`}
              onClick={() => selectMention(mention)}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{getTypeIcon(mention.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{mention.name}</p>
                    <Badge className={`text-xs ${getTypeBadgeColor(mention.type)}`}>
                      {mention.type}
                    </Badge>
                  </div>
                  {mention.parentName && (
                    <p className="text-xs text-gray-500 truncate">
                      in {mention.parentName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {getFilteredMentions().length === 0 && (
            <div className="p-3 text-center text-gray-500 text-sm">
              No items found matching &quot;{mentionQuery}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
} 