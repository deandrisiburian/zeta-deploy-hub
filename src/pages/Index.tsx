import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faRocket, 
  faCloud, 
  faBolt,
  faGauge,
  faShieldAlt
} from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const features = [
    {
      icon: faRocket,
      title: "Lightning Fast Deploys",
      description: "Deploy in seconds with our optimized pipeline"
    },
    {
      icon: faGithub,
      title: "GitHub Integration",
      description: "Import directly from your GitHub repositories"
    },
    {
      icon: faCloud,
      title: "Global CDN",
      description: "Your sites served from edge locations worldwide"
    },
    {
      icon: faBolt,
      title: "Instant Rollbacks",
      description: "Roll back to any previous deployment instantly"
    },
    {
      icon: faGauge,
      title: "Real-time Analytics",
      description: "Monitor your site performance in real-time"
    },
    {
      icon: faShieldAlt,
      title: "Secure by Default",
      description: "Automatic SSL certificates and DDoS protection"
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar user={user} />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center space-y-8">
          <div className="inline-block">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6 animate-float">
              <FontAwesomeIcon icon={faRocket} className="text-4xl" />
            </div>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold">
            Deploy Your Sites
            <br />
            <span className="gradient-text">Instantly</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The platform for developers who ship. Deploy from GitHub or upload your files. 
            Lightning fast, globally distributed, and always online.
          </p>
          
          <div className="flex gap-4 justify-center pt-4">
            <Link to={user ? "/dashboard" : "/signup"}>
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-lg px-8 py-6">
                <FontAwesomeIcon icon={faRocket} className="mr-2" />
                Start Deploying
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="glass hover:bg-white/10 text-lg px-8 py-6">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Everything You Need
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="glass-strong rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                  <FontAwesomeIcon icon={feature.icon} className="text-xl" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="glass-strong rounded-3xl p-12 text-center">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Deploy?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of developers shipping faster with zhost
            </p>
            <Link to={user ? "/dashboard" : "/signup"}>
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-lg px-8 py-6">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2024 zhost - Developed by Zeta Corporation</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
