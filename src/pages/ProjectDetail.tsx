import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faQrcode, 
  faExternalLink, 
  faSync, 
  faTrash,
  faEdit
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState("");
  const [editingDomain, setEditingDomain] = useState(false);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [redeploying, setRedeploying] = useState(false);

  useEffect(() => {
    fetchProject();
    fetchDeployments();
  }, [id]);

  const fetchProject = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Failed to fetch project");
      navigate("/dashboard");
    } else {
      setProject(data);
      setDomain(data.domain || "");
    }
    setLoading(false);
  };

  const fetchDeployments = async () => {
    const { data, error } = await supabase
      .from("deployments")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDeployments(data);
    }
  };

  const updateDomain = async () => {
    const { error } = await supabase
      .from("projects")
      .update({ domain })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update domain");
    } else {
      toast.success("Domain updated successfully");
      setEditingDomain(false);
      fetchProject();
    }
  };

  const redeploy = async () => {
    if (!project) return;
    
    setRedeploying(true);
    
    // Update project status to building
    const { error: updateError } = await supabase
      .from("projects")
      .update({ status: "building" })
      .eq("id", id);

    if (updateError) {
      toast.error("Failed to trigger redeploy");
      setRedeploying(false);
      return;
    }

    toast.success("Redeployment started!");

    // Call the deploy-to-vercel edge function
    try {
      const { error: deployError } = await supabase.functions.invoke('deploy-to-vercel', {
        body: {
          projectId: id,
          name: project.name,
          githubUrl: project.github_url,
          githubBranch: project.github_branch
        }
      });

      if (deployError) {
        toast.error("Deployment failed: " + deployError.message);
        await supabase
          .from("projects")
          .update({ status: "failed" })
          .eq("id", id);
      } else {
        toast.success("Deployment completed successfully!");
      }
    } catch (err) {
      console.error("Deployment error:", err);
      toast.error("Failed to deploy");
      await supabase
        .from("projects")
        .update({ status: "failed" })
        .eq("id", id);
    }

    setRedeploying(false);
    fetchProject();
    fetchDeployments();
  };

  const deleteProject = async () => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete project");
    } else {
      toast.success("Project deleted successfully");
      navigate("/dashboard");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      deployed: "default",
      building: "secondary",
      pending: "secondary",
      failed: "destructive",
      success: "default"
    };
    
    const labels: Record<string, string> = {
      deployed: "Deployed",
      building: "Building",
      pending: "Pending",
      failed: "Failed",
      success: "Success"
    };
    
    return (
      <Badge variant={variants[status] || "secondary"} className="text-lg px-4 py-1">
        {labels[status] || status}
      </Badge>
    );
  };

  const retryDeployment = async (deploymentId: string) => {
    if (!project) return;
    
    toast.success("Retrying deployment...");
    
    await supabase
      .from("projects")
      .update({ status: "building" })
      .eq("id", id);

    try {
      const { error: deployError } = await supabase.functions.invoke('deploy-to-vercel', {
        body: {
          projectId: id,
          name: project.name,
          githubUrl: project.github_url,
          githubBranch: project.github_branch
        }
      });

      if (deployError) {
        toast.error("Retry failed: " + deployError.message);
        await supabase
          .from("projects")
          .update({ status: "failed" })
          .eq("id", id);
      } else {
        toast.success("Retry completed successfully!");
      }
    } catch (err) {
      console.error("Retry error:", err);
      toast.error("Failed to retry deployment");
      await supabase
        .from("projects")
        .update({ status: "failed" })
        .eq("id", id);
    }

    fetchProject();
    fetchDeployments();
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 text-center">
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  const deploymentUrl = project?.deployment_url || `https://${project?.name}.vercel.app`;

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">{project?.name}</h1>
            {getStatusBadge(project?.status)}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={redeploy}
              disabled={redeploying || project?.status === "building"}
              className="glass hover:bg-white/10"
            >
              <FontAwesomeIcon icon={faSync} className={`mr-2 ${redeploying ? 'animate-spin' : ''}`} />
              {redeploying ? "Deploying..." : "Redeploy"}
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteProject}
            >
              <FontAwesomeIcon icon={faTrash} className="mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Deployment URL */}
          <div className="glass-strong rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">Deployment URL</h2>
            <div className="flex items-center gap-2">
              <Input 
                value={deploymentUrl} 
                readOnly 
                className="glass"
              />
              <a href={deploymentUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon" className="glass hover:bg-white/10">
                  <FontAwesomeIcon icon={faExternalLink} />
                </Button>
              </a>
            </div>
          </div>

          {/* QR Code */}
          <div className="glass-strong rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">QR Code</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full glass hover:bg-white/10">
                  <FontAwesomeIcon icon={faQrcode} className="mr-2" />
                  View QR Code
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-strong">
                <DialogHeader>
                  <DialogTitle>Scan to Visit</DialogTitle>
                </DialogHeader>
                <div className="flex justify-center p-6 bg-white rounded-lg">
                  <QRCodeSVG value={deploymentUrl} size={256} />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Custom Domain */}
        <div className="glass-strong rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Custom Domain</h2>
            {!editingDomain && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setEditingDomain(true)}
                className="glass hover:bg-white/10"
              >
                <FontAwesomeIcon icon={faEdit} className="mr-2" />
                Edit
              </Button>
            )}
          </div>
          
          {editingDomain ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  placeholder="example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="glass"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={updateDomain}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  Save Domain
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingDomain(false);
                    setDomain(project?.domain || "");
                  }}
                  className="glass hover:bg-white/10"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              {project?.domain || "No custom domain set"}
            </p>
          )}
        </div>

        {/* Deployment History */}
        <div className="glass-strong rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Deployment History</h2>
          {deployments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No deployments yet</p>
          ) : (
            <div className="space-y-3">
              {deployments.map((deployment) => (
                <div 
                  key={deployment.id} 
                  className="glass rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <Badge 
                        variant={
                          deployment.status === "success" ? "default" : 
                          deployment.status === "failed" ? "destructive" : 
                          "secondary"
                        }
                      >
                        {deployment.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(deployment.created_at).toLocaleString()}
                      </span>
                    </div>
                    {deployment.deployed_at && (
                      <p className="text-xs text-muted-foreground">
                        Deployed: {new Date(deployment.deployed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  {deployment.status === "failed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => retryDeployment(deployment.id)}
                      className="glass hover:bg-white/10"
                    >
                      <FontAwesomeIcon icon={faSync} className="mr-2" />
                      Retry
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Info */}
        <div className="glass-strong rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Project Information</h2>
          <div className="space-y-2 text-sm">
            {project?.github_url && (
              <div>
                <span className="text-muted-foreground">GitHub URL:</span>{" "}
                <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {project.github_url}
                </a>
              </div>
            )}
            {project?.github_branch && (
              <div>
                <span className="text-muted-foreground">Branch:</span> {project.github_branch}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Created:</span>{" "}
              {new Date(project?.created_at).toLocaleDateString()}
            </div>
            <div>
              <span className="text-muted-foreground">Last Updated:</span>{" "}
              {new Date(project?.updated_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
