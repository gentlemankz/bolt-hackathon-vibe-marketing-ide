"use client";

import React, { useState, useEffect } from 'react';
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
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import { useCreateAdSet, useFacebookCampaign } from '@/lib/hooks/use-facebook-data';
import { 
  AdSetCreateRequest, 
  AdSetTargeting,
  OPTIMIZATION_GOALS, 
  BILLING_EVENTS, 
  COUNTRIES,
  FACEBOOK_POSITIONS,
  PUBLISHER_PLATFORMS,
  BIDDING_STRATEGIES,
  getCompatibleBillingEvents,
  isValidOptimizationBillingCombination
} from '@/lib/types';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface AdSetCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function AdSetCreateDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName
}: AdSetCreateDialogProps) {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    optimization_goal: '',
    billing_event: '',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    bid_amount: '',
    status: 'PAUSED'
  });

  // Targeting state
  const [targeting, setTargeting] = useState<AdSetTargeting>({
    geo_locations: {
      countries: []
    },
    age_min: 18,
    age_max: 65,
    genders: [1, 2], // All genders
    facebook_positions: ['feed'],
    publisher_platforms: ['facebook'],
    device_platforms: ['mobile', 'desktop']
  });

  // Additional state
  const [budgetType, setBudgetType] = useState<'daily' | 'lifetime'>('daily');
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['US']);
  const [selectedPositions, setSelectedPositions] = useState<string[]>(['feed']);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook']);
  const [error, setError] = useState<string | null>(null);

  // Hooks
  const createAdSetMutation = useCreateAdSet();
  const { data: campaign } = useFacebookCampaign(campaignId);

  // Campaign Budget Optimization (hardcoded to false for now)
  const isCBOEnabled = false;

  // Helper functions
  const handleBudgetChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCountryToggle = (countryCode: string) => {
    setSelectedCountries(prev => {
      const newCountries = prev.includes(countryCode)
        ? prev.filter(c => c !== countryCode)
        : [...prev, countryCode];
      
      setTargeting(prevTargeting => ({
        ...prevTargeting,
        geo_locations: {
          ...prevTargeting.geo_locations,
          countries: newCountries
        }
      }));
      
      return newCountries;
    });
  };

  const handlePositionToggle = (position: string) => {
    setSelectedPositions(prev => {
      const newPositions = prev.includes(position)
        ? prev.filter(p => p !== position)
        : [...prev, position];
      
      setTargeting(prevTargeting => ({
        ...prevTargeting,
        facebook_positions: newPositions
      }));
      
      return newPositions;
    });
  };

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev => {
      const newPlatforms = prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform];
      
      setTargeting(prevTargeting => ({
        ...prevTargeting,
        publisher_platforms: newPlatforms
      }));
      
      return newPlatforms;
    });
  };

  const handleOptimizationGoalChange = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      optimization_goal: goal,
      billing_event: '' // Reset billing event when optimization goal changes
    }));
  };

  // Initialize countries and targeting on mount
  useEffect(() => {
    setTargeting(prev => ({
      ...prev,
      geo_locations: {
        ...prev.geo_locations,
        countries: selectedCountries
      },
      facebook_positions: selectedPositions,
      publisher_platforms: selectedPlatforms
    }));
  }, [selectedCountries, selectedPositions, selectedPlatforms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Ad set name is required');
      return;
    }

    if (!formData.optimization_goal) {
      setError('Optimization goal is required');
      return;
    }

    if (!formData.billing_event) {
      setError('Billing event is required');
      return;
    }

    if (!formData.bid_strategy) {
      setError('Bidding strategy is required');
      return;
    }

    if ((formData.bid_strategy === 'LOWEST_COST_WITH_BID_CAP' || formData.bid_strategy === 'TARGET_COST') && !formData.bid_amount) {
      setError('Bid amount is required for the selected bidding strategy');
      return;
    }

    if (!isCBOEnabled && budgetType === 'daily' && !formData.daily_budget) {
      setError('Daily budget is required');
      return;
    }

    if (!isCBOEnabled && budgetType === 'lifetime' && !formData.lifetime_budget) {
      setError('Lifetime budget is required');
      return;
    }

    if (selectedCountries.length === 0) {
      setError('At least one country must be selected');
      return;
    }

    if (selectedPositions.length === 0) {
      setError('At least one ad placement must be selected');
      return;
    }

    if (selectedPlatforms.length === 0) {
      setError('At least one platform must be selected');
      return;
    }

    // Validate optimization goal and billing event compatibility
    if (!isValidOptimizationBillingCombination(formData.optimization_goal, formData.billing_event)) {
      setError('Selected billing event is not compatible with the optimization goal');
      return;
    }

    try {
      const adSetData: AdSetCreateRequest = {
        name: formData.name,
        campaign_id: campaignId,
        optimization_goal: formData.optimization_goal,
        billing_event: formData.billing_event,
        targeting: {
          ...targeting,
          geo_locations: {
            countries: selectedCountries
          },
          facebook_positions: selectedPositions,
          publisher_platforms: selectedPlatforms
        },
        status: formData.status,
        bid_strategy: formData.bid_strategy,
        ...(formData.bid_amount && { bid_amount: formData.bid_amount }),
        ...(!isCBOEnabled && budgetType === 'daily' && { daily_budget: formData.daily_budget }),
        ...(!isCBOEnabled && budgetType === 'lifetime' && { lifetime_budget: formData.lifetime_budget })
      };

      await createAdSetMutation.mutateAsync({
        campaignId,
        adSetData
      });

      // Reset form and close dialog
      setFormData({
        name: '',
        optimization_goal: '',
        billing_event: '',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        bid_amount: '',
        status: 'PAUSED'
      });
      setSelectedCountries(['US']);
      setSelectedPositions(['feed']);
      setSelectedPlatforms(['facebook']);
      setBudgetType('daily');
      onOpenChange(false);

    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to create ad set');
    }
  };

  const isLoading = createAdSetMutation.isPending;

  // Get compatible billing events for selected optimization goal
  const compatibleBillingEvents = formData.optimization_goal 
    ? getCompatibleBillingEvents(formData.optimization_goal)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Ad Set</DialogTitle>
          <DialogDescription>
            Create a new ad set for campaign: {campaignName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adSetName">Ad Set Name *</Label>
                <Input
                  id="adSetName"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter ad set name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <RadioGroup
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ACTIVE" id="active" />
                    <Label htmlFor="active">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PAUSED" id="paused" />
                    <Label htmlFor="paused">Paused</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>

          {/* Audience Targeting */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Audience Targeting</h3>
            
            <div className="space-y-4">
              {/* Countries */}
              <div className="space-y-2">
                <Label>Countries *</Label>
                <div className="border rounded-lg p-4 max-h-40 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {COUNTRIES.map((country) => (
                      <div key={country.code} className="flex items-center space-x-2">
                        <Checkbox
                          id={country.code}
                          checked={selectedCountries.includes(country.code)}
                          onCheckedChange={() => handleCountryToggle(country.code)}
                        />
                        <Label htmlFor={country.code} className="text-sm">
                          {country.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedCountries.map((countryCode) => {
                    const country = COUNTRIES.find(c => c.code === countryCode);
                    return (
                      <Badge key={countryCode} variant="secondary" className="flex items-center gap-1">
                        {country?.name}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleCountryToggle(countryCode)}
                        />
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Age Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ageMin">Minimum Age</Label>
                  <Select
                    value={targeting.age_min?.toString()}
                    onValueChange={(value) => setTargeting(prev => ({ ...prev, age_min: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 48 }, (_, i) => i + 18).map((age) => (
                        <SelectItem key={age} value={age.toString()}>
                          {age}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ageMax">Maximum Age</Label>
                  <Select
                    value={targeting.age_max?.toString()}
                    onValueChange={(value) => setTargeting(prev => ({ ...prev, age_max: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 48 }, (_, i) => i + 18).map((age) => (
                        <SelectItem key={age} value={age.toString()}>
                          {age}
                        </SelectItem>
                      ))}
                      <SelectItem value="65">65+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Ad Placements */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Ad Placements</h3>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Platforms */}
              <div className="space-y-2">
                <Label>Platforms *</Label>
                <div className="space-y-2">
                  {PUBLISHER_PLATFORMS.map((platform) => (
                    <div key={platform} className="flex items-center space-x-2">
                      <Checkbox
                        id={platform}
                        checked={selectedPlatforms.includes(platform)}
                        onCheckedChange={() => handlePlatformToggle(platform)}
                      />
                      <Label htmlFor={platform} className="capitalize">
                        {platform.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Positions */}
              <div className="space-y-2">
                <Label>Positions *</Label>
                <div className="space-y-2">
                  {FACEBOOK_POSITIONS.map((position) => (
                    <div key={position} className="flex items-center space-x-2">
                      <Checkbox
                        id={position}
                        checked={selectedPositions.includes(position)}
                        onCheckedChange={() => handlePositionToggle(position)}
                      />
                      <Label htmlFor={position} className="capitalize">
                        {position.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Optimization & Billing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Optimization & Billing</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="optimizationGoal">Optimization Goal *</Label>
                <Select
                  value={formData.optimization_goal}
                  onValueChange={handleOptimizationGoalChange}
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
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="billingEvent">Billing Event *</Label>
                <Select
                  value={formData.billing_event}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, billing_event: value }))}
                  disabled={!formData.optimization_goal}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select billing event" />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_EVENTS
                      .filter(event => compatibleBillingEvents.includes(event.value))
                      .map((event) => (
                        <SelectItem key={event.value} value={event.value}>
                          <div>
                            <div className="font-medium">{event.label}</div>
                            <div className="text-xs text-muted-foreground">{event.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {formData.optimization_goal && compatibleBillingEvents.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No compatible billing events for selected optimization goal
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bidStrategy">Bidding Strategy *</Label>
                <Select
                  value={formData.bid_strategy}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, bid_strategy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
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
              </div>
              
              {(formData.bid_strategy === 'LOWEST_COST_WITH_BID_CAP' || formData.bid_strategy === 'TARGET_COST') && (
                <div className="space-y-2">
                  <Label htmlFor="bidAmount">
                    {formData.bid_strategy === 'TARGET_COST' ? 'Target Cost' : 'Bid Cap'} *
                  </Label>
                  <Input
                    id="bidAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.bid_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, bid_amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Budget */}
          {!isCBOEnabled && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Budget</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Budget Type</Label>
                  <RadioGroup
                    value={budgetType}
                    onValueChange={(value: 'daily' | 'lifetime') => setBudgetType(value)}
                    className="flex gap-4"
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
                  <Label htmlFor="budget">
                    {budgetType === 'daily' ? 'Daily Budget' : 'Lifetime Budget'} *
                  </Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    min="1"
                    value={budgetType === 'daily' ? formData.daily_budget : formData.lifetime_budget}
                    onChange={(e) => handleBudgetChange(
                      budgetType === 'daily' ? 'daily_budget' : 'lifetime_budget',
                      e.target.value
                    )}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    {budgetType === 'daily' 
                      ? 'Amount to spend per day' 
                      : 'Total amount to spend over the lifetime of the ad set'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {isCBOEnabled && (
            <Alert>
              <AlertDescription>
                Budget is managed at the campaign level (Campaign Budget Optimization is enabled).
              </AlertDescription>
            </Alert>
          )}

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
              {isLoading ? 'Creating Ad Set...' : 'Create Ad Set'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}