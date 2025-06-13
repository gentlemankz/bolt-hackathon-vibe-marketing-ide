"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Upload, 
  Play, 
  Download, 
  Trash2, 
  User, 
  Video, 
  Zap, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Plus,
  Eye,
  Clock,
  Star
} from "lucide-react";
import { 
  useTavusReplicas, 
  useTavusStockReplicas, 
  useTavusPersonas, 
  useTavusStockPersonas,
  useTavusVideos,
  useCreateReplica,
  useCreatePersona,
  useCreateVideo,
  useDeleteReplica,
  useAllTavusReplicas
} from "@/lib/hooks/use-tavus-data";
import { TavusReplica, TavusPersona, TavusVideo, TavusStockPersona, AvatarCreationRequest } from "@/lib/types";

export function AvatarConstructor() {
  const [activeTab, setActiveTab] = useState("replicas");
  
  // Replica creation state
  const [replicaName, setReplicaName] = useState("");
  const [trainVideoFile, setTrainVideoFile] = useState<File | null>(null);
  const [trainVideoUrl, setTrainVideoUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Video creation state
  const [selectedReplicaId, setSelectedReplicaId] = useState("");
  const [videoScript, setVideoScript] = useState("");
  const [videoName, setVideoName] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  
  // Persona creation state
  const [personaName, setPersonaName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [personaContext, setPersonaContext] = useState("");
  
  // UI state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedStockReplica, setSelectedStockReplica] = useState<TavusReplica | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<TavusPersona | TavusStockPersona | null>(null);
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Hooks
  const { data: userReplicas, isLoading: userReplicasLoading, error: userReplicasError } = useTavusReplicas();
  const { data: stockReplicas, isLoading: stockReplicasLoading, error: stockReplicasError } = useTavusStockReplicas();
  const { data: allReplicasData, isLoading: allReplicasLoading } = useAllTavusReplicas();
  const { data: userPersonas, isLoading: userPersonasLoading } = useTavusPersonas();
  const { data: stockPersonas } = useTavusStockPersonas();
  const { data: videos, isLoading: videosLoading } = useTavusVideos();
  
  // Mutations
  const createReplicaMutation = useCreateReplica();
  const createPersonaMutation = useCreatePersona();
  const createVideoMutation = useCreateVideo();
  const deleteReplicaMutation = useDeleteReplica();

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Status color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'training':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'generating':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // File upload handler
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        setError('Please select a video file');
        return;
      }
      
      // Validate file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        setError('Video file must be less than 100MB');
        return;
      }
      
      setTrainVideoFile(file);
      setError(null);
    }
  };

  // Simulate file upload (in real implementation, this would upload to cloud storage)
  const uploadFile = async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    setIsUploading(false);
    
    // Return a mock URL (in real implementation, this would be the actual uploaded file URL)
    return `https://example.com/uploads/${file.name}`;
  };

  // Create replica handler
  const handleCreateReplica = async () => {
    if (!replicaName.trim()) {
      setError('Please enter a replica name');
      return;
    }

    let videoUrl = trainVideoUrl;
    
    if (trainVideoFile) {
      try {
        videoUrl = await uploadFile(trainVideoFile);
      } catch (err) {
        setError('Failed to upload video file');
        return;
      }
    }

    if (!videoUrl) {
      setError('Please provide a training video URL or upload a file');
      return;
    }

    try {
      await createReplicaMutation.mutateAsync({
        trainVideoUrl: videoUrl,
        replicaName: replicaName.trim()
      });
      
      setSuccess('Replica creation started! Training may take several minutes.');
      setReplicaName('');
      setTrainVideoFile(null);
      setTrainVideoUrl('');
      setUploadProgress(0);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create replica');
    }
  };

  // Create persona handler
  const handleCreatePersona = async () => {
    if (!personaName.trim() || !systemPrompt.trim() || !personaContext.trim()) {
      setError('Please fill in all persona fields');
      return;
    }

    try {
      await createPersonaMutation.mutateAsync({
        personaName: personaName.trim(),
        systemPrompt: systemPrompt.trim(),
        context: personaContext.trim()
      });
      
      setSuccess('Persona created successfully!');
      setPersonaName('');
      setSystemPrompt('');
      setPersonaContext('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create persona');
    }
  };

  // Create video handler
  const handleCreateVideo = async () => {
    if (!selectedReplicaId || !videoScript.trim() || !videoName.trim()) {
      setError('Please select a replica and fill in all video fields');
      return;
    }

    try {
      const request: AvatarCreationRequest = {
        replica_id: selectedReplicaId,
        script: videoScript.trim(),
        video_name: videoName.trim(),
        background_url: backgroundUrl.trim() || undefined
      };

      await createVideoMutation.mutateAsync(request);
      
      setSuccess('Video generation started! This may take a few minutes.');
      setSelectedReplicaId('');
      setVideoScript('');
      setVideoName('');
      setBackgroundUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create video');
    }
  };

  // Delete replica handler
  const handleDeleteReplica = async (replicaId: string) => {
    if (!confirm('Are you sure you want to delete this replica? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteReplicaMutation.mutateAsync(replicaId);
      setSuccess('Replica deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete replica');
    }
  };

  // Get all available replicas for video creation
  const getAllReplicas = () => {
    const allReplicas = [];
    if (allReplicasData?.stockReplicas) {
      allReplicas.push(...allReplicasData.stockReplicas);
    }
    if (allReplicasData?.userReplicas) {
      allReplicas.push(...allReplicasData.userReplicas);
    }
    return allReplicas.filter(replica => replica.status === 'ready');
  };

  // Render replicas tab
  const renderReplicasTab = () => (
    <div className="space-y-6">
      {/* Create New Replica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Replica
          </CardTitle>
          <CardDescription>
            Train a custom AI avatar using your own video
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="replica-name">Replica Name</Label>
            <Input
              id="replica-name"
              value={replicaName}
              onChange={(e) => setReplicaName(e.target.value)}
              placeholder="Enter a name for your replica"
            />
          </div>

          <div className="space-y-2">
            <Label>Training Video</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={trainVideoUrl}
                  onChange={(e) => setTrainVideoUrl(e.target.value)}
                  placeholder="Enter video URL"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {trainVideoFile && (
                <div className="text-sm text-muted-foreground">
                  Selected: {trainVideoFile.name} ({(trainVideoFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
              
              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <div className="text-sm text-muted-foreground">
                    Uploading... {uploadProgress}%
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleCreateReplica}
            disabled={createReplicaMutation.isPending || isUploading}
            className="w-full"
          >
            {createReplicaMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Replica...
              </>
            ) : (
              <>
                <User className="h-4 w-4 mr-2" />
                Create Replica
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Stock Replicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Stock Replicas
          </CardTitle>
          <CardDescription>
            Pre-trained avatars ready to use
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stockReplicasLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading stock replicas...</span>
            </div>
          ) : stockReplicasError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to load stock replicas</AlertDescription>
            </Alert>
          ) : stockReplicas && stockReplicas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stockReplicas.map((replica) => (
                <Card key={replica.replica_id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{replica.replica_name}</h4>
                      <Badge className={getStatusColor(replica.status)}>
                        {replica.status}
                      </Badge>
                    </div>
                    {replica.avatar_url && (
                      <div className="mb-3">
                        <img
                          src={replica.avatar_url}
                          alt={replica.replica_name}
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedStockReplica(replica)}
                        className="flex-1"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No stock replicas available
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Replicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Your Replicas
          </CardTitle>
          <CardDescription>
            Custom replicas you've created
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userReplicasLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading your replicas...</span>
            </div>
          ) : userReplicasError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to load your replicas</AlertDescription>
            </Alert>
          ) : userReplicas && userReplicas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userReplicas.map((replica) => (
                <Card key={replica.replica_id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{replica.replica_name}</h4>
                      <Badge className={getStatusColor(replica.status)}>
                        {replica.status}
                      </Badge>
                    </div>
                    
                    {replica.status === 'training' && (
                      <div className="mb-3">
                        <div className="text-sm text-muted-foreground mb-1">
                          Training Progress: {replica.training_progress}
                        </div>
                        <Progress value={parseInt(replica.training_progress)} />
                      </div>
                    )}
                    
                    {replica.error_message && (
                      <Alert variant="destructive" className="mb-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {replica.error_message}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {replica.avatar_url && (
                      <div className="mb-3">
                        <img
                          src={replica.avatar_url}
                          alt={replica.replica_name}
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={replica.status !== 'ready'}
                        className="flex-1"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteReplica(replica.replica_id)}
                        disabled={deleteReplicaMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No replicas created yet. Create your first replica above!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render videos tab
  const renderVideosTab = () => (
    <div className="space-y-6">
      {/* Create New Video */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Generate New Video
          </CardTitle>
          <CardDescription>
            Create a personalized video using your replicas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-replica">Select Replica</Label>
            <Select value={selectedReplicaId} onValueChange={setSelectedReplicaId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a replica" />
              </SelectTrigger>
              <SelectContent>
                {getAllReplicas().map((replica) => (
                  <SelectItem key={replica.replica_id} value={replica.replica_id}>
                    {replica.replica_name} {replica.is_stock ? '(Stock)' : '(Custom)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video-name">Video Name</Label>
            <Input
              id="video-name"
              value={videoName}
              onChange={(e) => setVideoName(e.target.value)}
              placeholder="Enter a name for your video"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video-script">Script</Label>
            <Textarea
              id="video-script"
              value={videoScript}
              onChange={(e) => setVideoScript(e.target.value)}
              placeholder="Enter the script for your video..."
              rows={6}
            />
            <div className="text-xs text-muted-foreground">
              {videoScript.length} characters
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="background-url">Background URL (Optional)</Label>
            <Input
              id="background-url"
              value={backgroundUrl}
              onChange={(e) => setBackgroundUrl(e.target.value)}
              placeholder="Enter background image/video URL"
            />
          </div>

          <Button
            onClick={handleCreateVideo}
            disabled={createVideoMutation.isPending || !selectedReplicaId || !videoScript.trim() || !videoName.trim()}
            className="w-full"
          >
            {createVideoMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Video...
              </>
            ) : (
              <>
                <Video className="h-4 w-4 mr-2" />
                Generate Video
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Videos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Your Videos
          </CardTitle>
          <CardDescription>
            Videos you've generated
          </CardDescription>
        </CardHeader>
        <CardContent>
          {videosLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading videos...</span>
            </div>
          ) : videos && videos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => (
                <Card key={video.video_id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{video.video_name}</h4>
                      <Badge className={getStatusColor(video.status)}>
                        {video.status}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-3">
                      Created: {new Date(video.created_at).toLocaleDateString()}
                    </div>
                    
                    {video.status === 'generating' && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Video is being generated...
                        </div>
                      </div>
                    )}
                    
                    {video.status === 'ready' && (
                      <div className="flex gap-2">
                        {video.hosted_url && (
                          <Button size="sm" variant="outline" asChild className="flex-1">
                            <a href={video.hosted_url} target="_blank" rel="noopener noreferrer">
                              <Play className="h-3 w-3 mr-1" />
                              Watch
                            </a>
                          </Button>
                        )}
                        {video.download_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={video.download_url} download>
                              <Download className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {video.status === 'error' && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Video generation failed
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No videos generated yet. Create your first video above!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render personas tab
  const renderPersonasTab = () => (
    <div className="space-y-6">
      {/* Create New Persona */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Persona
          </CardTitle>
          <CardDescription>
            Define a custom AI personality for your avatars
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="persona-name">Persona Name</Label>
            <Input
              id="persona-name"
              value={personaName}
              onChange={(e) => setPersonaName(e.target.value)}
              placeholder="Enter persona name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Define the personality and behavior..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="persona-context">Context</Label>
            <Textarea
              id="persona-context"
              value={personaContext}
              onChange={(e) => setPersonaContext(e.target.value)}
              placeholder="Provide additional context and background..."
              rows={3}
            />
          </div>

          <Button
            onClick={handleCreatePersona}
            disabled={createPersonaMutation.isPending}
            className="w-full"
          >
            {createPersonaMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Persona...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Create Persona
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Stock Personas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Stock Personas
          </CardTitle>
          <CardDescription>
            Pre-built personalities ready to use
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stockPersonas && stockPersonas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stockPersonas.map((persona) => (
                <Card key={persona.persona_id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">{persona.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {persona.description}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedPersona(persona)}
                      className="w-full"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No stock personas available
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Personas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Your Personas
          </CardTitle>
          <CardDescription>
            Custom personas you've created
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userPersonasLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading personas...</span>
            </div>
          ) : userPersonas && userPersonas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPersonas.map((persona) => (
                <Card key={persona.persona_id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">{persona.persona_name}</h4>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                      {persona.context}
                    </p>
                    <div className="text-xs text-muted-foreground mb-3">
                      Created: {new Date(persona.created_at).toLocaleDateString()}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedPersona(persona)}
                      className="w-full"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No personas created yet. Create your first persona above!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">AI Avatar Constructor</h2>
        <p className="text-muted-foreground">
          Create and manage AI-powered video avatars for personalized lead nurturing
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="replicas" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Replicas
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="personas" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Personas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="replicas" className="space-y-4">
          {renderReplicasTab()}
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          {renderVideosTab()}
        </TabsContent>

        <TabsContent value="personas" className="space-y-4">
          {renderPersonasTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
}