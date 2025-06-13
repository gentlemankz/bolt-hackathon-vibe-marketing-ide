"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { CAMPAIGN_OBJECTIVES, CampaignCreateRequest } from "@/lib/types";
import { useCreateCampaign } from "@/lib/hooks/use-facebook-data";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface CampaignCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adAccountId: string;
  adAccountName: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function CampaignCreateDialog({
  open,
  onOpenChange,
  adAccountId,
  adAccountName
}: CampaignCreateDialogProps) {
  // Form state
  const [formData, setFormData] = useState<CampaignCreateRequest>({
    name: '',
    objective: '',
    status: 'PAUSED',
    special_ad_categories: [],
    buying_type: 'AUCTION'
  });

  const [budgetType, setBudgetType] = useState<'daily' | 'lifetime'>('daily');
  const [error, setError] = useState<string | null>(null);

  // Mutation hook
  const createCampaignMutation = useCreateCampaign();

  // Helper functions
  const handleBudgetChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Clear the other budget field when switching types
      ...(field === 'daily_budget' && { lifetime_budget: undefined }),
      ...(field === 'lifetime_budget' && { daily_budget: undefined })
    }));
  };

  // Event handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form validation
    if (!formData.name.trim()) {
      setError('Campaign name is required');
      return;
    }

    if (!formData.objective) {
      setError('Campaign objective is required');
      return;
    }

    // Budget validation
    if (budgetType === 'daily' && !formData.daily_budget) {
      setError('Daily budget is required');
      return;
    }

    if (budgetType === 'lifetime' && !formData.lifetime_budget) {
      setError('Lifetime budget is required');
      return;
    }

    try {
      await createCampaignMutation.mutateAsync({
        adAccountId,
        campaignData: formData
      });

      // Reset form and close dialog on success
      setFormData({
        name: '',
        objective: '',
        status: 'PAUSED',
        special_ad_categories: [],
        buying_type: 'AUCTION'
      });
      setBudgetType('daily');
      onOpenChange(false);

    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to create campaign');
    }
  };

  // Find selected objective for description display
  const selectedObjective = CAMPAIGN_OBJECTIVES.find(obj => obj.value === formData.objective);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
          <DialogDescription>
            Create a new campaign for ad account: {adAccountName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Campaign Name */}
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Campaign Name *</Label>
            <Input
              id="campaign-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter campaign name"
              required
            />
          </div>

          {/* Campaign Objective */}
          <div className="space-y-2">
            <Label htmlFor="objective">Campaign Objective *</Label>
            <Select
              value={formData.objective}
              onValueChange={(value) => setFormData(prev => ({ ...prev, objective: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select campaign objective" />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_OBJECTIVES.map((objective) => (
                  <SelectItem key={objective.value} value={objective.value}>
                    <div>
                      <div className="font-medium">{objective.label}</div>
                      <div className="text-xs text-muted-foreground">{objective.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedObjective && (
              <p className="text-xs text-muted-foreground">
                {selectedObjective.description}
              </p>
            )}
          </div>

          {/* Campaign Status */}
          <div className="space-y-2">
            <Label>Campaign Status</Label>
            <RadioGroup
              value={formData.status}
              onValueChange={(value: 'ACTIVE' | 'PAUSED') => setFormData(prev => ({ ...prev, status: value }))}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PAUSED" id="paused" />
                <Label htmlFor="paused">Paused</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ACTIVE" id="active" />
                <Label htmlFor="active">Active</Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              We recommend starting with "Paused" to set up your ad sets first
            </p>
          </div>

          {/* Budget Type */}
          <div className="space-y-2">
            <Label>Budget Type</Label>
            <RadioGroup
              value={budgetType}
              onValueChange={(value: 'daily' | 'lifetime') => setBudgetType(value)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily">Daily Budget</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lifetime" id="lifetime" disabled />
                <Label htmlFor="lifetime">Lifetime Budget</Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Lifetime budget is currently disabled for new campaigns
            </p>
          </div>

          {/* Budget Amount */}
          <div className="space-y-2">
            <Label htmlFor="budget">
              {budgetType === 'daily' ? 'Daily Budget' : 'Lifetime Budget'} (Optional)
            </Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              min="1"
              value={budgetType === 'daily' ? formData.daily_budget || '' : formData.lifetime_budget || ''}
              onChange={(e) => handleBudgetChange(
                budgetType === 'daily' ? 'daily_budget' : 'lifetime_budget',
                e.target.value
              )}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Budget amount in cents (e.g., 1000 = $10.00). Leave empty to set later.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createCampaignMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createCampaignMutation.isPending || !formData.name.trim() || !formData.objective}
              className="flex items-center gap-2"
            >
              {createCampaignMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {createCampaignMutation.isPending ? 'Creating...' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}