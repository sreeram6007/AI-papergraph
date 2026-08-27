import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { BookOpen, Upload, Network, FileText, Zap, Eye } from 'lucide-react';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <FileText className="h-8 w-8 text-green-600" />,
      title: "Document Processing",
      description: "Upload PDF and TXT files for intelligent analysis and entity extraction."
    },
    {
      icon: <Zap className="h-8 w-8 text-green-600" />,
      title: "AI-Powered Analysis",
      description: "Advanced NLP algorithms identify entities and relationships automatically."
    },
    {
      icon: <Eye className="h-8 w-8 text-green-600" />,
      title: "Interactive Visualization",
      description: "Explore your knowledge graph with zoom, pan, and interactive features."
    }
  ];

  return (
    <div className="paper-home">
      {/* Hero Section */}
      <div className="paper-hero">
        <div className="paper-hero-grid" />
        <div className="paper-hero-content">
            <div className="paper-kicker"><BookOpen size={15} /> A calmer way to read across papers</div>
            
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              PaperGraph
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Turn a stack of papers into a map of ideas.
            </p>
            
            <p className="paper-hero-copy">PaperGraph finds the people, places, methods, and concepts inside your research, then connects them in one living workspace.</p>
            <div className="paper-hero-actions">
              <Button
                onClick={() => navigate('/upload')}
                size="lg"
                className="paper-button paper-button-primary"
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload Documents
              </Button>
              
              <Button
                onClick={() => navigate('/graph')}
                variant="outline"
                size="lg"
                className="paper-button paper-button-secondary"
              >
                <Network className="h-5 w-5 mr-2" />
                View Graph
              </Button>
            </div>
          </div>
        </div>

      {/* Features Section */}
      <div className="paper-section paper-section-tinted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="paper-section-heading">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Your research, with the connective tissue visible.
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A focused workspace for turning unstructured reading into something you can navigate.
            </p>
          </div>
          
          <div className="paper-feature-grid">
            {features.map((feature, index) => (
              <div key={index} className="paper-feature">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-center">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="paper-section paper-section-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="paper-section-heading">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              From page to pattern.
            </h2>
          </div>
          
          <div className="paper-process-grid">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-800">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Documents</h3>
              <p className="text-gray-600">Upload your PDF or TXT files to get started</p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Processing</h3>
              <p className="text-gray-600">Our AI extracts entities and relationships</p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Explore Graph</h3>
              <p className="text-gray-600">Visualize and interact with your knowledge graph</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
