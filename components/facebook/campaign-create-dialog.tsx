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

interface CampaignCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adAccountId: string;
  adAccountName: string;
}

export function CampaignCreateDialog({
  open,
  onOpenChange,
  adAccountId,
  adAccountName,
}: CampaignCreateDialogProps) {
  const [formData, setFormData] = useState<CampaignCreateRequest>({
    name: "",
    objective: "",
    status: "PAUSED",
    special_ad_categories: [],
  });
  const [budgetType, setBudgetType] = useState<"daily" | "lifetime">("daily");
  const [error, setError] = useState<string | null>(null);

  const createCampaignMutation = useCreateCampaign();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Campaign name is required");
      return;
    }

    if (!formData.objective) {
      setError("Campaign objective is required");
      return;
    }

    try {
      await createCampaignMutation.mutateAsync({
        adAccountId,
        campaignData: formData,
      });

      // Reset form and close dialog
      setFormData({
        name: "",
        objective: "",
        status: "PAUSED",
        special_ad_categories: [],
      });
      setBudgetType("daily");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    }
  };

  const handleBudgetChange = (value: string) => {
    if (budgetType === "daily") {
      setFormData(prev => ({
        ...prev,
        daily_budget: value,
        lifetime_budget: undefined,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        lifetime_budget: value,
        daily_budget: undefined,
      }));
    }
  };

  const selectedObjective = CAMPAIGN_OBJECTIVES.find(obj => obj.value === formData.objective);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
          <DialogDescription>
            Create a new campaign for {adAccountName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="campaign-name">Campaign Name *</Label>
            <Input
              id="campaign-name"
              placeholder="Enter campaign name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={createCampaignMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-objective">Campaign Objective *</Label>
            <Select
              value={formData.objective}
              onValueChange={(value) => setFormData(prev => ({ ...prev, objective: value }))}
              disabled={createCampaignMutation.isPending}
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

          <div className="space-y-2">
            <Label>Campaign Status</Label>
            <RadioGroup
              value={formData.status}
              onValueChange={(value: "ACTIVE" | "PAUSED") => 
                setFormData(prev => ({ ...prev, status: value }))
              }
              disabled={createCampaignMutation.isPending}
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
              Recommended: Start with &apos;Paused&apos; to set up ad sets and ads before going live
            </p>
          </div>

          <div className="space-y-2">
            <Label>Budget Type (Optional)</Label>
            <RadioGroup
              value={budgetType}
              onValueChange={(value: "daily" | "lifetime") => setBudgetType(value)}
              disabled={createCampaignMutation.isPending}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily">Daily Budget</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lifetime" id="lifetime" />
                <Label htmlFor="lifetime">Lifetime Budget</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget-amount">
              {budgetType === "daily" ? "Daily Budget" : "Lifetime Budget"} (Optional)
            </Label>
            <Input
              id="budget-amount"
              type="number"
              placeholder="Enter amount in cents (e.g., 1000 = $10.00)"
              value={budgetType === "daily" ? formData.daily_budget || "" : formData.lifetime_budget || ""}
              onChange={(e) => handleBudgetChange(e.target.value)}
              disabled={createCampaignMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Amount in cents. Leave empty to set budget at ad set level.
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
            >
              {createCampaignMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Campaign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 