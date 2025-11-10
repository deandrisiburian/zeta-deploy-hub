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

  useEffect(() => {
    fetchProject();
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
    const { error } = await supabase
      .from("projects")
      .update({ status: "pending" })
      .eq("id", id);

    if (error) {
      toast.error("Failed to trigger redeploy");
    } else {
      toast.success("Redeployment started!");
      fetchProject();
    }
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
      failed: "destructive"
    };
    
    return (
      <Badge variant={variants[status] || "secondary"} className="text-lg px-4 py-1">
        {status}
      </Badge>
    );
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
              className="glass hover:bg-white/10"
            >
              <FontAwesomeIcon icon={faSync} className="mr-2" />
              Redeploy
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
