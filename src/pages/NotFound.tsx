import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-sm px-4">
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-bold mb-2 text-foreground">404</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Ops! Página não encontrada.
        </p>
        <Button asChild>
          <a href="/">Voltar ao início</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
