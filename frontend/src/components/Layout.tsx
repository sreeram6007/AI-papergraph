import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Upload, Network } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="paper-app min-h-screen flex flex-col">
      <nav className="paper-nav">
        <div className="paper-nav-inner">
            <Link to="/" className="paper-brand">
              <span className="paper-brand-mark"><BookOpen size={19} /></span>
              <span><strong>Paper</strong>Graph</span>
            </Link>
            
            <div className="paper-nav-links">
              <Link
                to="/"
                className={`paper-nav-link ${isActive('/') ? 'active' : ''}`}
              >
                <BookOpen className="h-4 w-4" />
                <span>Home</span>
              </Link>
              
              <Link
                to="/upload"
                className={`paper-nav-link ${isActive('/upload') ? 'active' : ''}`}
              >
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </Link>
              
              <Link
                to="/graph"
                className={`paper-nav-link ${isActive('/graph') ? 'active' : ''}`}
              >
                <Network className="h-4 w-4" />
                <span>Graph</span>
              </Link>

              <div className="paper-nav-divider" />
              <ThemeToggle />
            </div>
          </div>
      </nav>
      
      <main className="flex-1 paper-main">
        {children}
      </main>
    </div>
  );
};

export default Layout;
