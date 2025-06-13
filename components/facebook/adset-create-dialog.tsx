"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, X } from "lucide-react";
import { useCreateAdSet, useFacebookCampaign } from "@/lib/hooks/use-facebook-data";
import { 
  AdSetCreateRequest, 
  OPTIMIZATION_GOALS, 
  BILLING_EVENTS, 
  COUNTRIES, 
  FACEBOOK_POSITIONS, 
  PUBLISHER_PLATFORMS,
  BIDDING_STRATEGIES,
  getCompatibleBillingEvents,
  isValidOptimizationBillingCombination
} from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface AdSetCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
}

export function AdSetCreateDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
}: AdSetCreateDialogProps) {
  const [formData, setFormData] = useState<Partial<AdSetCreateRequest>>({
    name: "",
    optimization_goal: "",
    billing_event: "",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    bid_amount: "",
    status: "PAUSED",
    targeting: {
      geo_locations: {
        countries: ["US"],
      },
      age_min: 18,
      age_max: 65,
      facebook_positions: ["feed"],
      publisher_platforms: ["facebook"],
    },
  });
  const [budgetType, setBudgetType] = useState<"daily" | "lifetime">("daily");
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["US"]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>(["feed"]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook"]);
  const [error, setError] = useState<string | null>(null);

  const createAdSetMutation = useCreateAdSet();
  const campaign = useFacebookCampaign(campaignId);

  // Check if campaign has CBO enabled
  const campaignHasCBO = false; // TODO: Add hasCBO property to FacebookCampaign type
  const showBudgetFields = !campaignHasCBO;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name?.trim()) {
      setError("Ad set name is required");
      return;
    }

    if (!formData.optimization_goal) {
      setError("Optimization goal is required");
      return;
    }

    if (!formData.billing_event) {
      setError("Billing event is required");
      return;
    }

    if (!formData.bid_strategy) {
      setError("Bidding strategy is required");
      return;
    }

    // Bid amount is only required for manual bidding strategies
    const requiresBidAmount = formData.bid_strategy === 'LOWEST_COST_WITH_BID_CAP' || formData.bid_strategy === 'TARGET_COST';
    if (requiresBidAmount && !formData.bid_amount) {
      setError("Bid amount is required for the selected bidding strategy");
      return;
    }

    // Validate optimization goal and billing event combination
    if (formData.optimization_goal && formData.billing_event) {
      if (!isValidOptimizationBillingCombination(formData.optimization_goal, formData.billing_event)) {
        setError(`Billing event "${formData.billing_event}" is not compatible with optimization goal "${formData.optimization_goal}". Please select a compatible billing event.`);
        return;
      }
    }

    // Validate budget only if campaign doesn't have CBO
    if (showBudgetFields) {
      const dailyBudget = budgetType === "daily" ? formData.daily_budget : undefined;
      const lifetimeBudget = budgetType === "lifetime" ? formData.lifetime_budget : undefined;

      if (!dailyBudget && !lifetimeBudget) {
        setError("Budget amount is required");
        return;
      }
    }

    // Prepare targeting data
    const targeting = {
      geo_locations: {
        countries: selectedCountries,
      },
      age_min: formData.targeting?.age_min || 18,
      age_max: formData.targeting?.age_max || 65,
      facebook_positions: selectedPositions,
      publisher_platforms: selectedPlatforms,
    };

    try {
      const adSetData: AdSetCreateRequest = {
        name: formData.name || '',
        campaign_id: campaignId,
        targeting,
        optimization_goal: formData.optimization_goal || '',
        billing_event: formData.billing_event || '',
        bid_amount: formData.bid_amount,
        status: 'PAUSED',
        bid_strategy: formData.bid_strategy || 'LOWEST_COST_WITHOUT_CAP',
        // Only include budget fields if campaign doesn't have CBO
        ...(showBudgetFields && budgetType === 'daily' && formData.daily_budget && { daily_budget: formData.daily_budget }),
        ...(showBudgetFields && budgetType === 'lifetime' && formData.lifetime_budget && { lifetime_budget: formData.lifetime_budget }),
      };

      await createAdSetMutation.mutateAsync({
        campaignId,
        adSetData,
      });

      // Reset form and close dialog
      setFormData({
        name: "",
        optimization_goal: "",
        billing_event: "",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        bid_amount: "",
        status: "PAUSED",
        targeting: {
          geo_locations: {
            countries: ["US"],
          },
          age_min: 18,
          age_max: 65,
          facebook_positions: ["feed"],
          publisher_platforms: ["facebook"],
        },
      });
      setSelectedCountries(["US"]);
      setSelectedPositions(["feed"]);
      setSelectedPlatforms(["facebook"]);
      setBudgetType("daily");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ad set");
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

  const handleCountryToggle = (countryCode: string) => {
    setSelectedCountries(prev => 
      prev.includes(countryCode)
        ? prev.filter(c => c !== countryCode)
        : [...prev, countryCode]
    );
  };

  const handlePositionToggle = (position: string) => {
    setSelectedPositions(prev => 
      prev.includes(position)
        ? prev.filter(p => p !== position)
        : [...prev, position]
    );
  };

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const selectedOptimizationGoal = OPTIMIZATION_GOALS.find(goal => goal.value === formData.optimization_goal);
  const selectedBillingEvent = BILLING_EVENTS.find(event => event.value === formData.billing_event);

  // Get compatible billing events for the selected optimization goal
  const compatibleBillingEvents = formData.optimization_goal 
    ? getCompatibleBillingEvents(formData.optimization_goal)
    : [];

  // Filter billing events to show only compatible ones
  const availableBillingEvents = BILLING_EVENTS.filter(event => 
    !formData.optimization_goal || compatibleBillingEvents.includes(event.value)
  );

  // Auto-select first compatible billing event when optimization goal changes
  const handleOptimizationGoalChange = (value: string) => {
    setFormData(prev => {
      const newCompatibleEvents = getCompatibleBillingEvents(value);
      const currentBillingEvent = prev.billing_event;
      
      // If current billing event is not compatible, select the first compatible one
      const newBillingEvent = newCompatibleEvents.includes(currentBillingEvent || '') 
        ? currentBillingEvent || ''
        : newCompatibleEvents[0] || '';

      return {
        ...prev,
        optimization_goal: value,
        billing_event: newBillingEvent
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Ad Set</DialogTitle>
          <DialogDescription>
            Create a new ad set for campaign: {campaignName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="adset-name">Ad Set Name *</Label>
              <Input
                id="adset-name"
                placeholder="Enter ad set name"
                value={formData.name || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={createAdSetMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Ad Set Status</Label>
              <RadioGroup
                value={formData.status}
                onValueChange={(value: "ACTIVE" | "PAUSED") => 
                  setFormData(prev => ({ ...prev, status: value }))
                }
                disabled={createAdSetMutation.isPending}
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
                Recommended: Start with &apos;Paused&apos; to review settings before going live
              </p>
            </div>
          </div>

          {/* Targeting */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Audience Targeting</h3>
            
            <div className="space-y-2">
              <Label>Countries *</Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                {COUNTRIES.map((country) => (
                  <div key={country.code} className="flex items-center space-x-2">
                    <Checkbox
                      id={country.code}
                      checked={selectedCountries.includes(country.code)}
                      onCheckedChange={() => handleCountryToggle(country.code)}
                      disabled={createAdSetMutation.isPending}
                    />
                    <Label htmlFor={country.code} className="text-sm">
                      {country.name}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedCountries.map(code => {
                  const country = COUNTRIES.find(c => c.code === code);
                  return (
                    <Badge key={code} variant="secondary" className="text-xs">
                      {country?.name}
                      <X 
                        className="ml-1 h-3 w-3 cursor-pointer" 
                        onClick={() => handleCountryToggle(code)}
                      />
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age-min">Minimum Age</Label>
                <Input
                  id="age-min"
                  type="number"
                  min="13"
                  max="65"
                  value={formData.targeting?.age_min || 18}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    targeting: {
                      ...prev.targeting!,
                      age_min: parseInt(e.target.value) || 18
                    }
                  }))}
                  disabled={createAdSetMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age-max">Maximum Age</Label>
                <Input
                  id="age-max"
                  type="number"
                  min="13"
                  max="65"
                  value={formData.targeting?.age_max || 65}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    targeting: {
                      ...prev.targeting!,
                      age_max: parseInt(e.target.value) || 65
                    }
                  }))}
                  disabled={createAdSetMutation.isPending}
                />
              </div>
            </div>
          </div>

          {/* Placements */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Ad Placements</h3>
            
            <div className="space-y-2">
              <Label>Publisher Platforms *</Label>
              <div className="grid grid-cols-2 gap-2">
                {PUBLISHER_PLATFORMS.map((platform) => (
                  <div key={platform.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={platform.value}
                      checked={selectedPlatforms.includes(platform.value)}
                      onCheckedChange={() => handlePlatformToggle(platform.value)}
                      disabled={createAdSetMutation.isPending}
                    />
                    <Label htmlFor={platform.value} className="text-sm">
                      {platform.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Facebook Positions *</Label>
              <div className="grid grid-cols-2 gap-2">
                {FACEBOOK_POSITIONS.map((position) => (
                  <div key={position.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={position.value}
                      checked={selectedPositions.includes(position.value)}
                      onCheckedChange={() => handlePositionToggle(position.value)}
                      disabled={createAdSetMutation.isPending}
                    />
                    <Label htmlFor={position.value} className="text-sm">
                      {position.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Optimization & Billing */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Optimization & Billing</h3>
            
            <div className="space-y-2">
              <Label htmlFor="optimization-goal">Optimization Goal *</Label>
              <Select
                value={formData.optimization_goal}
                onValueChange={(value) => handleOptimizationGoalChange(value)}
                disabled={createAdSetMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select optimization goal" />
                </SelectTrigger>
                <SelectContent>
                  {OPTIMIZATION_GOALS.map((goal) => (
                    <SelectItem key={goal.value} value={goal.value}>
                      <div>
                        <div className="font-medium">{goal.label}</div>
                        <div className="text-xs text-muted-foreground">{goal.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedOptimizationGoal && (
                <p className="text-xs text-muted-foreground">
                  {selectedOptimizationGoal.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing-event">Billing Event *</Label>
              <Select
                value={formData.billing_event}
                onValueChange={(value) => setFormData(prev => ({ ...prev, billing_event: value }))}
                disabled={createAdSetMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select billing event" />
                </SelectTrigger>
                <SelectContent>
                  {availableBillingEvents.map((event) => (
                    <SelectItem key={event.value} value={event.value}>
                      <div>
                        <div className="font-medium">{event.label}</div>
                        <div className="text-xs text-muted-foreground">{event.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBillingEvent && (
                <p className="text-xs text-muted-foreground">
                  {selectedBillingEvent.description}
                </p>
              )}
              {formData.optimization_goal && compatibleBillingEvents.length > 0 && (
                <p className="text-xs text-blue-600">
                  Compatible billing events for {selectedOptimizationGoal?.label}: {compatibleBillingEvents.join(', ')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bid-strategy">Bidding Strategy *</Label>
              <Select
                value={formData.bid_strategy}
                onValueChange={(value) => setFormData(prev => ({ ...prev, bid_strategy: value as "LOWEST_COST_WITHOUT_CAP" | "LOWEST_COST_WITH_BID_CAP" | "TARGET_COST" }))}
                disabled={createAdSetMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bidding strategy" />
                </SelectTrigger>
                <SelectContent>
                  {BIDDING_STRATEGIES.map((strategy) => (
                    <SelectItem key={strategy.value} value={strategy.value}>
                      <div>
                        <div className="font-medium">{strategy.label}</div>
                        <div className="text-xs text-muted-foreground">{strategy.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.bid_strategy && (
                <p className="text-xs text-muted-foreground">
                  {BIDDING_STRATEGIES.find(s => s.value === formData.bid_strategy)?.description}
                </p>
              )}
            </div>

            {(formData.bid_strategy === 'LOWEST_COST_WITH_BID_CAP' || formData.bid_strategy === 'TARGET_COST') && (
              <div className="space-y-2">
                <Label htmlFor="bid-amount">
                  {formData.bid_strategy === 'TARGET_COST' ? 'Target Cost' : 'Maximum Bid'} (cents) *
                </Label>
                <Input
                  id="bid-amount"
                  type="number"
                  placeholder="Enter amount in cents (e.g., 100 = $1.00)"
                  value={formData.bid_amount || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, bid_amount: e.target.value }))}
                  disabled={createAdSetMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Amount in cents. For example, 100 = $1.00
                  {formData.bid_strategy === 'TARGET_COST' && ' (average cost per result)'}
                  {formData.bid_strategy === 'LOWEST_COST_WITH_BID_CAP' && ' (maximum you&apos;ll pay)'}
                </p>
              </div>
            )}

            {formData.bid_strategy === 'LOWEST_COST_WITHOUT_CAP' && (
              <Alert>
                <AlertDescription>
                  Facebook will automatically optimize your bids to get the most results for your budget. No manual bid amount needed.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Budget */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Budget</h3>
            
            {campaignHasCBO ? (
              <Alert>
                <AlertDescription>
                  This campaign uses Campaign Budget Optimization (CBO). The budget is managed at the campaign level, so ad sets cannot have their own budgets.
                </AlertDescription>
              </Alert>
            ) : campaign.isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Checking campaign budget settings...</span>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Budget Type *</Label>
                  <RadioGroup
                    value={budgetType}
                    onValueChange={(value: "daily" | "lifetime") => setBudgetType(value)}
                    disabled={createAdSetMutation.isPending}
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
                    {budgetType === "daily" ? "Daily Budget" : "Lifetime Budget"} (cents) *
                  </Label>
                  <Input
                    id="budget-amount"
                    type="number"
                    placeholder="Enter budget amount in cents (e.g., 1000 = $10.00)"
                    value={budgetType === "daily" ? formData.daily_budget || "" : formData.lifetime_budget || ""}
                    onChange={(e) => handleBudgetChange(e.target.value)}
                    disabled={createAdSetMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Amount in cents. For example, 1000 = $10.00
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createAdSetMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createAdSetMutation.isPending || 
                !formData.name?.trim() || 
                !formData.optimization_goal || 
                !formData.billing_event || 
                !formData.bid_strategy ||
                ((formData.bid_strategy === 'LOWEST_COST_WITH_BID_CAP' || formData.bid_strategy === 'TARGET_COST') && !formData.bid_amount) ||
                (showBudgetFields && !formData.daily_budget && !formData.lifetime_budget)
              }
            >
              {createAdSetMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Ad Set
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 