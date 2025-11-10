import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faFileImport } from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";

const NewProject = () => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [githubBranch, setGithubBranch] = useState("main");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    toast.success(`${acceptedFiles.length} files ready for upload`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const createProjectFromGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !githubUrl) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please login first");
      navigate("/login");
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: projectName,
        github_url: githubUrl,
        github_branch: githubBranch,
        status: "building"
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create project");
      setLoading(false);
      return;
    }

    toast.success("Project created! Deploying to Vercel...");

    // Call the deploy-to-vercel edge function
    try {
      const { error: deployError } = await supabase.functions.invoke('deploy-to-vercel', {
        body: {
          projectId: data.id,
          name: projectName,
          githubUrl,
          githubBranch
        }
      });

      if (deployError) {
        toast.error("Deployment failed: " + deployError.message);
        await supabase
          .from("projects")
          .update({ status: "failed" })
          .eq("id", data.id);
      } else {
        toast.success("Deployment started successfully!");
      }
    } catch (err) {
      console.error("Deployment error:", err);
      toast.error("Failed to start deployment");
      await supabase
        .from("projects")
        .update({ status: "failed" })
        .eq("id", data.id);
    }

    navigate(`/project/${data.id}`);
    setLoading(false);
  };

  const createProjectFromFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || files.length === 0) {
      toast.error("Please provide a project name and upload files");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please login first");
      navigate("/login");
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: projectName,
        status: "building"
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create project");
      setLoading(false);
      return;
    }

    toast.success("Project created! Deploying to Vercel...");

    // Call the deploy-to-vercel edge function
    try {
      const { error: deployError } = await supabase.functions.invoke('deploy-to-vercel', {
        body: {
          projectId: data.id,
          name: projectName
        }
      });

      if (deployError) {
        toast.error("Deployment failed: " + deployError.message);
        await supabase
          .from("projects")
          .update({ status: "failed" })
          .eq("id", data.id);
      } else {
        toast.success("Deployment started successfully!");
      }
    } catch (err) {
      console.error("Deployment error:", err);
      toast.error("Failed to start deployment");
      await supabase
        .from("projects")
        .update({ status: "failed" })
        .eq("id", data.id);
    }

    navigate(`/project/${data.id}`);
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Create New Project</h1>
          <p className="text-muted-foreground">Deploy from GitHub or upload your files</p>
        </div>

        <Tabs defaultValue="github" className="w-full">
          <TabsList className="grid w-full grid-cols-2 glass-strong">
            <TabsTrigger value="github">
              <FontAwesomeIcon icon={faGithub} className="mr-2" />
              Import from GitHub
            </TabsTrigger>
            <TabsTrigger value="upload">
              <FontAwesomeIcon icon={faUpload} className="mr-2" />
              Upload Files
            </TabsTrigger>
          </TabsList>

          <TabsContent value="github" className="space-y-4">
            <form onSubmit={createProjectFromGithub} className="glass-strong rounded-2xl p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="my-awesome-site"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="glass"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="github-url">GitHub Repository URL</Label>
                <Input
                  id="github-url"
                  placeholder="https://github.com/username/repo"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="glass"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  placeholder="main"
                  value={githubBranch}
                  onChange={(e) => setGithubBranch(e.target.value)}
                  className="glass"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                disabled={loading}
              >
                <FontAwesomeIcon icon={faFileImport} className="mr-2" />
                {loading ? "Creating..." : "Import & Deploy"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <form onSubmit={createProjectFromFiles} className="glass-strong rounded-2xl p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upload-name">Project Name</Label>
                <Input
                  id="upload-name"
                  placeholder="my-awesome-site"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="glass"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Upload Files</Label>
                <div
                  {...getRootProps()}
                  className={`glass rounded-xl p-12 border-2 border-dashed cursor-pointer transition-all ${
                    isDragActive ? "border-primary bg-primary/10" : "border-white/20 hover:border-primary/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="text-center">
                    <FontAwesomeIcon icon={faUpload} className="text-4xl text-primary mb-4" />
                    {isDragActive ? (
                      <p className="text-lg">Drop the files here...</p>
                    ) : (
                      <>
                        <p className="text-lg mb-2">Drag & drop files here</p>
                        <p className="text-sm text-muted-foreground">or click to select files</p>
                      </>
                    )}
                    {files.length > 0 && (
                      <p className="text-sm text-primary mt-4">
                        {files.length} file(s) selected
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                disabled={loading}
              >
                <FontAwesomeIcon icon={faUpload} className="mr-2" />
                {loading ? "Uploading..." : "Upload & Deploy"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default NewProject;
