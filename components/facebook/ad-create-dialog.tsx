"use client";

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Upload, 
  X, 
  Image, 
  Video, 
  ExternalLink 
} from 'lucide-react';
import { useCreateAd, useUploadMedia, useFacebookPages } from '@/lib/hooks/use-facebook-data';
import { AdCreateRequest, CTA_TYPES } from '@/lib/types';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface AdCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adsetId: string;
  adsetName: string;
  adAccountId: string;
}

interface ErrorWithResponse {
  response?: {
    json: () => Promise<{ error: string }>;
  };
  message: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function AdCreateDialog({
  open,
  onOpenChange,
  adsetId,
  adsetName,
  adAccountId
}: AdCreateDialogProps) {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    creativeName: '',
    mediaFormat: 'image' as 'image' | 'video',
    primaryText: '',
    headline: '',
    description: '',
    websiteUrl: '',
    ctaType: 'LEARN_MORE',
    displayLink: '',
    pageId: ''
  });

  // Media upload state
  const [uploadedMedia, setUploadedMedia] = useState<{
    mediaId: string;
    mediaType: 'image' | 'video';
    fileName: string;
    fileSize: number;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const createAdMutation = useCreateAd();
  const uploadMediaMutation = useUploadMedia();
  const { data: pagesData, isLoading: pagesLoading, error: pagesError } = useFacebookPages(adAccountId);

  // Helper functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Event handlers
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      setError('Please select an image or video file');
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    try {
      const mediaType = isImage ? 'image' : 'video';
      const result = await uploadMediaMutation.mutateAsync({
        file,
        adAccountId,
        mediaType
      });

      setUploadedMedia({
        mediaId: result.mediaId,
        mediaType,
        fileName: file.name,
        fileSize: file.size
      });

      // Update media format based on uploaded file
      setFormData(prev => ({
        ...prev,
        mediaFormat: mediaType
      }));

    } catch (err) {
      const error = err as ErrorWithResponse;
      if (error.response) {
        try {
          const errorData = await error.response.json();
          setError(errorData.error || 'Failed to upload media');
        } catch {
          setError('Failed to upload media');
        }
      } else {
        setError(error.message || 'Failed to upload media');
      }
    }
  };

  const handleRemoveMedia = () => {
    setUploadedMedia(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Ad name is required');
      return;
    }

    if (!formData.creativeName.trim()) {
      setError('Creative name is required');
      return;
    }

    if (!formData.primaryText.trim()) {
      setError('Primary text is required');
      return;
    }

    if (!formData.headline.trim()) {
      setError('Headline is required');
      return;
    }

    if (!formData.websiteUrl.trim()) {
      setError('Website URL is required');
      return;
    }

    if (!formData.pageId) {
      setError('Please select a Facebook page');
      return;
    }

    if (!uploadedMedia) {
      setError('Please upload an image or video');
      return;
    }

    try {
      const adData: AdCreateRequest = {
        name: formData.name,
        adset_id: adsetId,
        creative: {
          name: formData.creativeName,
          object_story_spec: {
            page_id: formData.pageId,
            ...(formData.mediaFormat === 'image' ? {
              photo_data: {
                image_hash: uploadedMedia.mediaId,
                caption: formData.primaryText,
                url: formData.websiteUrl
              }
            } : {
              video_data: {
                video_id: uploadedMedia.mediaId,
                message: formData.primaryText,
                call_to_action: {
                  type: formData.ctaType,
                  value: {
                    link: formData.websiteUrl,
                    link_caption: formData.displayLink || undefined
                  }
                }
              }
            }),
            ...(formData.mediaFormat === 'image' && {
              link_data: {
                link: formData.websiteUrl,
                message: formData.primaryText,
                name: formData.headline,
                description: formData.description,
                image_hash: uploadedMedia.mediaId,
                call_to_action: {
                  type: formData.ctaType,
                  value: {
                    link: formData.websiteUrl,
                    link_caption: formData.displayLink || undefined
                  }
                }
              }
            })
          }
        },
        status: 'PAUSED'
      };

      await createAdMutation.mutateAsync({
        adsetId,
        adData
      });

      // Reset form and close dialog
      setFormData({
        name: '',
        creativeName: '',
        mediaFormat: 'image',
        primaryText: '',
        headline: '',
        description: '',
        websiteUrl: '',
        ctaType: 'LEARN_MORE',
        displayLink: '',
        pageId: ''
      });
      setUploadedMedia(null);
      onOpenChange(false);

    } catch (err) {
      const error = err as ErrorWithResponse;
      if (error.response) {
        try {
          const errorData = await error.response.json();
          setError(errorData.error || 'Failed to create ad');
        } catch {
          setError('Failed to create ad');
        }
      } else {
        setError(error.message || 'Failed to create ad');
      }
    }
  };

  const isLoading = createAdMutation.isPending || uploadMediaMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Ad</DialogTitle>
          <DialogDescription>
            Create a new ad for ad set: {adsetName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adName">Ad Name *</Label>
                <Input
                  id="adName"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter ad name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="creativeName">Creative Name *</Label>
                <Input
                  id="creativeName"
                  value={formData.creativeName}
                  onChange={(e) => handleInputChange('creativeName', e.target.value)}
                  placeholder="Enter creative name"
                  required
                />
              </div>
            </div>
          </div>

          {/* Page/Account Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Page/Account Selection</h3>
            
            <div className="space-y-2">
              <Label htmlFor="pageId">Facebook Page *</Label>
              {pagesLoading ? (
                <div className="flex items-center gap-2 p-3 border rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading pages...</span>
                </div>
              ) : pagesError ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    Failed to load Facebook pages. Please try again.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select
                  value={formData.pageId}
                  onValueChange={(value) => handleInputChange('pageId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Facebook page" />
                  </SelectTrigger>
                  <SelectContent>
                    {pagesData?.facebook_pages?.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.name}
                      </SelectItem>
                    )) || (
                      <SelectItem value="" disabled>
                        No pages available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
              {!pagesLoading && !pagesError && (!pagesData?.facebook_pages || pagesData.facebook_pages.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  No Facebook pages found. Make sure your account has access to at least one page.
                </p>
              )}
            </div>
          </div>

          {/* Media Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Media Upload</h3>
            
            <div className="space-y-2">
              <Label>Upload Image or Video *</Label>
              
              {!uploadedMedia ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <div className="flex justify-center gap-2 mb-4">
                      <Image className="h-8 w-8 text-gray-400" />
                      <Video className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Click to upload an image or video
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadMediaMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {uploadMediaMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {uploadMediaMutation.isPending ? 'Uploading...' : 'Choose File'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Supported formats: JPG, PNG, GIF, MP4, MOV (max 50MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {uploadedMedia.mediaType === 'image' ? (
                        <Image className="h-8 w-8 text-blue-500" />
                      ) : (
                        <Video className="h-8 w-8 text-purple-500" />
                      )}
                      <div>
                        <p className="font-medium">{uploadedMedia.fileName}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(uploadedMedia.fileSize)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveMedia}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Creative Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Creative Content</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primaryText">Primary Text *</Label>
                <Textarea
                  id="primaryText"
                  value={formData.primaryText}
                  onChange={(e) => handleInputChange('primaryText', e.target.value)}
                  placeholder="Enter the main text for your ad"
                  rows={3}
                  required
                />
                <p className="text-xs text-gray-500">
                  This text appears above your image/video
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="headline">Headline *</Label>
                <Input
                  id="headline"
                  value={formData.headline}
                  onChange={(e) => handleInputChange('headline', e.target.value)}
                  placeholder="Enter a compelling headline"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter additional description (optional)"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Destination & CTA */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Destination & Call-to-Action</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Website URL *</Label>
                <div className="relative">
                  <Input
                    id="websiteUrl"
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
                    placeholder="https://example.com"
                    required
                    className="pr-10"
                  />
                  <ExternalLink className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ctaType">Call-to-Action Button</Label>
                  <Select
                    value={formData.ctaType}
                    onValueChange={(value) => handleInputChange('ctaType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CTA_TYPES.map((cta) => (
                        <SelectItem key={cta} value={cta}>
                          {cta.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="displayLink">Display Link</Label>
                  <Input
                    id="displayLink"
                    value={formData.displayLink}
                    onChange={(e) => handleInputChange('displayLink', e.target.value)}
                    placeholder="example.com/page"
                  />
                  <p className="text-xs text-gray-500">
                    Optional: Custom text to display instead of full URL
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Creating Ad...' : 'Create Ad'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}