import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faRocket, faTrash, faExternalLink } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }
    setUser(session.user);
    fetchProjects(session.user.id);
  };

  const fetchProjects = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch projects");
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      toast.error("Failed to delete project");
    } else {
      toast.success("Project deleted successfully");
      setProjects(projects.filter(p => p.id !== projectId));
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      deployed: "default",
      building: "secondary",
      pending: "secondary",
      failed: "destructive"
    };
    
    const labels: Record<string, string> = {
      deployed: "Deployed",
      building: "Building",
      pending: "Pending",
      failed: "Failed"
    };
    
    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Your Projects</h1>
            <p className="text-muted-foreground">Manage and deploy your websites</p>
          </div>
          <Link to="/new-project">
            <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              New Project
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="glass-strong rounded-2xl p-12 max-w-md mx-auto">
              <FontAwesomeIcon icon={faRocket} className="text-6xl text-primary mb-4" />
              <h2 className="text-2xl font-bold mb-2">No projects yet</h2>
              <p className="text-muted-foreground mb-6">Create your first project to get started</p>
              <Link to="/new-project">
                <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Create Project
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="glass-strong rounded-2xl p-6 hover:bg-white/10 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold">{project.name}</h3>
                  {getStatusBadge(project.status)}
                </div>
                
                {project.domain && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {project.domain}
                  </p>
                )}
                
                {project.github_url && (
                  <p className="text-sm text-muted-foreground mb-4 truncate">
                    {project.github_url}
                  </p>
                )}

                <div className="flex gap-2 mt-4">
                  <Link to={`/project/${project.id}`} className="flex-1">
                    <Button variant="outline" className="w-full glass hover:bg-white/10">
                      <FontAwesomeIcon icon={faExternalLink} className="mr-2" />
                      View
                    </Button>
                  </Link>
                  <Button 
                    variant="destructive" 
                    onClick={() => deleteProject(project.id)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
