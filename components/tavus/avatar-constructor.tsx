"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Video, 
  User, 
  RefreshCw,
  Camera,
  Play,
  ExternalLink,
  Download
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  useTavusReplicas, 
  useTavusStockReplicas, 
  useTavusVideos,
  useAllTavusReplicas,
  useCreateReplica, 
  useCreateVideo,
  useTavusStockPersonas
} from "@/lib/hooks/use-tavus-data";
import type { TavusVideo } from "@/lib/types";
import { TavusConnect } from "./tavus-connect";

export function AvatarConstructor() {
  const [activeTab, setActiveTab] = useState("replicas");
  const [selectedReplica, setSelectedReplica] = useState<string>("");
  const [replicaName, setReplicaName] = useState<string>("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [script, setScript] = useState<string>("");
  const [videoName, setVideoName] = useState<string>("");
  const [isTavusConnected, setIsTavusConnected] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check Tavus connection status
  useEffect(() => {
    const checkTavusConnection = async () => {
      try {
        const response = await fetch('/api/tavus/connection');
        if (response.ok) {
          const data = await response.json();
          setIsTavusConnected(data.connection?.is_connected && data.connection?.connection_status === 'connected');
        } else {
          setIsTavusConnected(false);
        }
      } catch {
        setIsTavusConnected(false);
      }
    };

    checkTavusConnection();
  }, []);

  const handleConnectionSuccess = () => {
    setIsTavusConnected(true);
  };

  // React Query hooks
  const { data: replicas = [], isLoading: isLoadingReplicas } = useTavusReplicas();
  const { data: stockReplicas = [], isLoading: isLoadingStockReplicas } = useTavusStockReplicas();
  const { data: allReplicasData } = useAllTavusReplicas();
  const { data: stockPersonas = [], isLoading: isLoadingStockPersonas } = useTavusStockPersonas();
  const { data: videos = [], isLoading: isLoadingVideos } = useTavusVideos();

  // Mutations
  const createReplicaMutation = useCreateReplica();
  const createVideoMutation = useCreateVideo();
  
  // Get all available replicas for video generation
  const availableReplicas = allReplicasData ? allReplicasData.allReplicas : [...stockReplicas, ...replicas];
  const readyReplicas = availableReplicas.filter(r => r.status === 'ready');

  

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      // In a real implementation, you'd upload this to a storage service
      // and get a public URL. For now, we'll use a placeholder.
      setVideoUrl(`https://example.com/uploads/${file.name}`);
    }
  };

  const handleCreateReplica = async () => {
    if (!videoUrl || !replicaName) {
      alert("Please provide a video URL and replica name");
      return;
    }

    try {
      await createReplicaMutation.mutateAsync({
        trainVideoUrl: videoUrl,
        replicaName: replicaName,
      });
      setVideoFile(null);
      setVideoUrl("");
      setReplicaName("");
      alert("Replica creation started! Training may take several hours.");
    } catch (error) {
      console.error("Error creating replica:", error);
      alert("Failed to create replica. Please try again.");
    }
  };

  const handleCreateVideo = async () => {
    if (!selectedReplica || !script || !videoName) {
      alert("Please select a replica, enter a script, and provide a video name");
      return;
    }

    // Basic validation
    if (script.length < 10) {
      alert("Script is too short. Please write at least a few sentences for the AI to speak.");
      return;
    }

    if (script.length > 2000) {
      alert("Script is too long. Please keep it under 2000 characters for optimal results.");
      return;
    }

    try {
      await createVideoMutation.mutateAsync({
        replica_id: selectedReplica,
        script: script,
        video_name: videoName,
      });
      setScript("");
      setVideoName("");
      // Don't use alert, let the UI handle success feedback
    } catch (error) {
      console.error("Error creating video:", error);
      // The error will be displayed by the error Alert component below the button
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'training':
      case 'generating':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Show loading state while checking connection
  if (isTavusConnected === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Show connection interface if not connected
  if (!isTavusConnected) {
    return <TavusConnect onConnectionSuccess={handleConnectionSuccess} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">AI Avatar Constructor</h2>
          <p className="text-muted-foreground">
            Create and manage AI avatars using Tavus technology for lead nurturing and customer engagement.
          </p>
        </div>

      </div>



      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="replicas">Replicas</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
        </TabsList>

        <TabsContent value="replicas" className="space-y-4">
          {/* Template Gallery */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎭 Ready Templates
                <Badge variant="secondary">Instant Use</Badge>
              </CardTitle>
              <CardDescription>
                Professional AI avatars ready to use immediately. No training required - just write your script and generate videos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStockReplicas ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : stockReplicas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No templates available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stockReplicas.map((replica) => (
                    <div 
                      key={replica.replica_id} 
                      className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        selectedReplica === replica.replica_id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedReplica(replica.replica_id)}
                    >
                      <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                        {replica.avatar_url ? (
                          <>
                            <video 
                              key={replica.replica_id}
                              src={replica.avatar_url} 
                              className="w-full h-full object-cover rounded-lg"
                              autoPlay
                              loop
                              muted
                              playsInline
                              preload="metadata"
                              onLoadedData={(e) => {
                                // Video loaded successfully, hide placeholder
                                console.log('✅ Video loaded successfully:', replica.replica_name, replica.avatar_url);
                                const target = e.target as HTMLVideoElement;
                                const placeholder = target.nextElementSibling as HTMLElement;
                                if (placeholder) placeholder.style.display = 'none';
                              }}
                              onError={(e) => {
                                // If video fails to load, show placeholder
                                console.log('❌ Video failed to load:', replica.replica_name, replica.avatar_url);
                                const target = e.target as HTMLVideoElement;
                                target.style.display = 'none';
                                const placeholder = target.nextElementSibling as HTMLElement;
                                if (placeholder) placeholder.style.display = 'flex';
                              }}
                              onCanPlay={() => {
                                console.log('🎬 Video can play:', replica.replica_name);
                              }}
                            />
                            <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 absolute inset-0 rounded-lg">
                              <div className="text-center">
                                <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-2 mx-auto shadow-sm">
                                  <User className="h-8 w-8 text-blue-500" />
                                </div>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Loading...</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                            <div className="text-center">
                              <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-2 mx-auto shadow-sm">
                                <User className="h-8 w-8 text-blue-500" />
                              </div>
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">AI Avatar</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-sm mb-1">{replica.replica_name}</h4>
                      <p className="text-xs text-muted-foreground mb-2 font-mono">ID: {replica.replica_id}</p>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          Ready to Use
                        </Badge>
                        {replica.status === 'deprecated' && (
                          <Badge variant="destructive" className="text-xs">
                            Deprecated
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create New Replica */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Create New Replica
                </CardTitle>
                <CardDescription>
                  Upload a training video to create your AI replica. The video should include the consent statement.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    <strong>Required consent statement:</strong> &quot;I, [FULL NAME], am currently speaking and consent Tavus to create an AI clone of me by using the audio and video samples I provide.&quot;
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="replica-name">Replica Name</Label>
                  <Input
                    id="replica-name"
                    placeholder="Enter replica name"
                    value={replicaName}
                    onChange={(e) => setReplicaName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video-upload">Training Video</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {videoFile ? (
                      <div className="space-y-2">
                        <Video className="h-8 w-8 mx-auto text-primary" />
                        <p className="text-sm font-medium">{videoFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload training video
                        </p>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {videoFile ? 'Change Video' : 'Upload Video'}
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={handleCreateReplica}
                  disabled={!videoUrl || !replicaName || createReplicaMutation.isPending}
                  className="w-full"
                >
                  {createReplicaMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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

            {/* Existing Replicas */}
            <Card>
              <CardHeader>
                <CardTitle>Your Replicas</CardTitle>
                <CardDescription>
                  Manage your existing AI replicas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingReplicas ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : replicas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No replicas created yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {replicas.map((replica) => (
                      <div key={replica.replica_id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{replica.replica_name}</h4>
                            <p className="text-xs text-muted-foreground font-mono">ID: {replica.replica_id}</p>
                          </div>
                          <div className="flex gap-1">
                            <Badge className={getStatusColor(replica.status)}>
                              {replica.status}
                            </Badge>
                            {replica.status === 'deprecated' && (
                              <Badge variant="destructive" className="text-xs">
                                Deprecated
                              </Badge>
                            )}
                          </div>
                        </div>
                        {replica.status === 'training' && (
                          <div className="text-xs text-muted-foreground">
                            Progress: {replica.training_progress}
                          </div>
                        )}
                        {replica.error_message && (
                          <div className="text-xs text-red-600 mt-1">
                            {replica.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Video */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Generate Video
                </CardTitle>
                <CardDescription>
                  Create a personalized video using your replica and a script
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="replica-select">Select Replica</Label>
                  <Select value={selectedReplica} onValueChange={setSelectedReplica}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a replica or template" />
                    </SelectTrigger>
                    <SelectContent>
                      {readyReplicas.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No replicas available. Create one or use templates.
                        </div>
                      ) : (
                        <>
                          {/* Stock Replicas (Templates) */}
                          {stockReplicas.length > 0 && (
                            <>
                              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Templates (Ready to Use)
                              </div>
                              {stockReplicas.map((replica) => (
                                <SelectItem 
                                  key={replica.replica_id} 
                                  value={replica.replica_id}
                                  disabled={replica.status === 'deprecated'}
                                >
                                  🎭 {replica.replica_name} ({replica.replica_id})
                                  {replica.status === 'deprecated' && ' - DEPRECATED'}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* User Replicas */}
                          {replicas.filter(r => r.status === 'ready').length > 0 && (
                            <>
                              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t">
                                Your Custom Replicas
                              </div>
                              {replicas.filter(r => r.status === 'ready').map((replica) => (
                                <SelectItem key={replica.replica_id} value={replica.replica_id}>
                                  👤 {replica.replica_name} ({replica.replica_id})
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video-name-input">Video Name</Label>
                  <Input
                    id="video-name-input"
                    placeholder="Enter video name"
                    value={videoName}
                    onChange={(e) => setVideoName(e.target.value)}
                  />
                </div>

                {/* Show selected replica/template info */}
                {selectedReplica && (
                  <div className="p-3 bg-muted rounded-lg">
                    {(() => {
                      const selectedReplicaData = readyReplicas.find(r => r.replica_id === selectedReplica);
                      if (!selectedReplicaData) return null;
                      
                      return (
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-background rounded-lg flex items-center justify-center overflow-hidden relative">
                            {selectedReplicaData.avatar_url ? (
                              <>
                                <video 
                                  src={selectedReplicaData.avatar_url} 
                                  className="w-full h-full object-cover rounded-lg"
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                  preload="metadata"
                                  onLoadedData={(e) => {
                                    // Video loaded successfully, hide placeholder
                                    const target = e.target as HTMLVideoElement;
                                    const placeholder = target.nextElementSibling as HTMLElement;
                                    if (placeholder) placeholder.style.display = 'none';
                                  }}
                                  onError={(e) => {
                                    const target = e.target as HTMLVideoElement;
                                    target.style.display = 'none';
                                    const placeholder = target.nextElementSibling as HTMLElement;
                                    if (placeholder) placeholder.style.display = 'flex';
                                  }}
                                />
                                <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg absolute inset-0">
                                  {selectedReplicaData.is_stock ? (
                                    <span className="text-lg">🎭</span>
                                  ) : (
                                    <span className="text-lg">👤</span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg">
                                {selectedReplicaData.is_stock ? (
                                  <span className="text-lg">🎭</span>
                                ) : (
                                  <span className="text-lg">👤</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {selectedReplicaData.replica_name}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              ID: {selectedReplicaData.replica_id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {selectedReplicaData.is_stock ? 'Template - Ready to use' : 'Your custom replica'}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="script-input">Script</Label>
                  <Textarea
                    id="script-input"
                    placeholder="Enter the text you want your AI avatar to speak..."
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    rows={6}
                  />
                </div>

                <Button 
                  onClick={handleCreateVideo}
                  disabled={!selectedReplica || !script || !videoName || createVideoMutation.isPending}
                  className="w-full"
                >
                  {createVideoMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating Video...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Generate Video
                    </>
                  )}
                </Button>
                
                {createVideoMutation.isSuccess && (
                  <Alert className="mt-4 border-green-200 bg-green-50 text-green-800">
                    <AlertDescription className="text-sm">
                      <strong>Video Generation Started!</strong> Your video is being created and will appear in the &quot;Generated Videos&quot; section below when ready. This usually takes 2-5 minutes.
                    </AlertDescription>
                  </Alert>
                )}
                
                {createVideoMutation.error && (
                  <Alert className="mt-4 border-red-200 bg-red-50 text-red-800">
                    <AlertDescription className="text-sm">
                      <strong>Video Creation Failed:</strong> {createVideoMutation.error.message}
                      {createVideoMutation.error.message.includes('Payment Required') && (
                        <div className="mt-2">
                          <a 
                            href="https://app.tavus.io/billing" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline font-medium"
                          >
                            → Add credits to your Tavus account
                          </a>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Generated Videos */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Videos</CardTitle>
                <CardDescription>
                  Your AI-generated videos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingVideos ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : videos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No videos generated yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {videos.map((video: TavusVideo) => (
                      <div key={video.video_id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{video.video_name}</h4>
                          <Badge className={getStatusColor(video.status)}>
                            {video.status}
                          </Badge>
                        </div>
                        {video.status === 'ready' && video.hosted_url && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="outline" asChild>
                              <a href={video.hosted_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View
                              </a>
                            </Button>
                            {video.download_url && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={video.download_url} download>
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </a>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="personas" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingStockPersonas ? (
              <div className="col-span-full flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              stockPersonas.map((persona) => (
                <Card key={persona.persona_id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{persona.name}</CardTitle>
                    <CardDescription>{persona.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {persona.system_prompt}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 