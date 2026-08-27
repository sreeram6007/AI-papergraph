// GraphViewerPage.tsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  X,
  RefreshCw,
  Plus,
  Trash2,
  Upload,
  FileText,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  Layers,
  Calendar,
  Users,
  FileCode,
  Share2,
  Sparkle,
  Filter,
} from "lucide-react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import clsx from "clsx";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";

cytoscape.use(coseBilkent);

interface NodeData {
  id: string;
  label: string;
  kind?: string;
  domain?: string;
  domain_color?: string;
}

interface EdgeData {
  source: string;
  target: string;
  label: string;
  score?: number;
}

interface DocumentData {
  id: string;
  title: string;
  filename?: string;
  authors?: string;
  year?: number;
  abstract?: string;
  simplified_abstract?: string;
  domain?: string;
  domain_color?: string;
}

interface RelationshipData {
  source_id: string;
  target_id: string;
  relationship: {
    relationship_type?: string;
    score?: number;
    confidence?: number;
    formatted_score?: string;
    similarity_reason?: string;
    explanation?: string;
    shared_concepts?: string[];
    differences?: string[];
  };
}

interface UploadFileItem {
  file: File;
  id: string;
}

// Client-side smart title formatter
const formatCleanTitle = (title?: string, filename?: string): string => {
  if (!title) {
    if (!filename) return "Untitled Paper";
    const clean = filename.replace(/\.(pdf|docx|txt)$/i, "").replace(/[_-]+/g, " ");
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  let cleaned = title.trim();
  cleaned = cleaned.replace(/^arXiv:\S+\s*/i, "");
  cleaned = cleaned.replace(/\s*\[[^\]]+\]\s*$/, "");

  if (/\.pdf$/i.test(cleaned) || /^\d{4}\.\d{4,5}/.test(cleaned)) {
    if (filename && filename !== cleaned) {
      return formatCleanTitle(filename);
    }
  }

  const ACRONYMS = new Set([
    "AI", "ML", "DL", "NLP", "LLM", "LLMS", "KG", "KGS", "RAG", "GPT",
    "BERT", "ZEP", "CNN", "RNN", "LSTM", "GNN", "API", "APIS", "DNA", "RNA"
  ]);
  const LOWERCASE = new Set([
    "a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to",
    "from", "by", "with", "in", "of", "over", "into", "via", "as"
  ]);

  const words = cleaned.split(/\s+/);
  return words
    .map((w, i) => {
      const upper = w.toUpperCase().replace(/[^\w]/g, "");
      if (ACRONYMS.has(upper)) return w.toUpperCase();
      const lower = w.toLowerCase().replace(/[^\w]/g, "");
      if (LOWERCASE.has(lower) && i !== 0 && !words[i - 1]?.endsWith(":")) {
        return w.toLowerCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
};

// Domain Color Fallback Map
const DOMAIN_COLORS: Record<string, string> = {
  "Computer Science & AI": "#e11d48",
  "Biological & Medical Sciences": "#059669",
  "Neuroscience & Cognitive Science": "#7c3aed",
  "Physics & Engineering": "#d97706",
  "Data Systems & Web": "#0284c7",
};

const GraphViewerPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { docId: initialDocId } = location.state || {};

  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(initialDocId || null);
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [relationships, setRelationships] = useState<RelationshipData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ score: number; reason?: string; paper: DocumentData }[]>([]);
  const [selectedRelationship, setSelectedRelationship] = useState<RelationshipData | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<DocumentData | null>(null);
  const [relationshipOpen, setRelationshipOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);

  // Clustering / Domain Filter State
  const [selectedClusterDomain, setSelectedClusterDomain] = useState<string | null>(null);
  const [clusterBoxBounds, setClusterBoxBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    domain: string;
    color: string;
    count: number;
  } | null>(null);

  // Layout states
  const [graphLayout, setGraphLayout] = useState<string>("cose-bilkent");

  // Add Paper Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Delete Paper Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<DocumentData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const cyInstance = useRef<any>(null);

  // Compute cluster domains and counts
  const availableDomains = useMemo(() => {
    const counts: Record<string, { count: number; color: string }> = {};
    for (const doc of documents) {
      const dom = doc.domain || "Computer Science & AI";
      const col = doc.domain_color || DOMAIN_COLORS[dom] || "#f87171";
      if (!counts[dom]) {
        counts[dom] = { count: 0, color: col };
      }
      counts[dom].count += 1;
    }
    return Object.entries(counts).map(([name, info]) => ({
      name,
      count: info.count,
      color: info.color,
    }));
  }, [documents]);

  // Fetch all documents list
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/documents");
      if (!res.ok) {
        if (res.status === 404) {
          setDocuments([]);
          return [];
        }
        throw new Error("Failed to load documents");
      }
      const data = await res.json();
      setDocuments(data || []);
      return data || [];
    } catch (err: unknown) {
      console.error("Error fetching documents:", err);
      if (err instanceof Error && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError"))) {
        setError("Failed to connect to backend server. Please ensure it is running.");
      }
      return [];
    }
  }, []);

  // Initial load of documents
  useEffect(() => {
    fetchDocuments().then((docs) => {
      if (initialDocId) {
        setActiveDocId(initialDocId);
      } else if (docs && docs.length > 0 && !activeDocId) {
        setActiveDocId(docs[0].id);
      }
    });
  }, [fetchDocuments, initialDocId]);

  // Load graph whenever activeDocId changes
  const loadGraph = useCallback(async (docId: string) => {
    if (!docId) return;
    try {
      setLoading(true);
      setError(null);
      setElements([]);

      const response = await fetch(`http://127.0.0.1:8000/graph/${docId}`);
      if (!response.ok) {
        throw new Error("There is no graph available for this file");
      }
      const data = await response.json();
      if (data.papers && data.papers.length > 0) {
        setDocuments(data.papers);
      }
      setRelationships(data.relationships || []);
      const currentDoc = (data.papers || []).find((p: DocumentData) => p.id === docId) || data.paper;
      setSelectedPaper(currentDoc || null);
      setSelectedRelationship(null);

      const cyElements = [
        ...data.nodes.map((n: NodeData) => {
          const domColor = n.domain_color || (n.domain && DOMAIN_COLORS[n.domain]) || "#f87171";
          return {
            data: {
              id: n.id,
              label: formatCleanTitle(n.label),
              kind: n.kind,
              domain: n.domain || "Computer Science & AI",
              domain_color: domColor,
            },
            group: "nodes",
          };
        }),
        ...data.edges.map((e: EdgeData) => {
          const rawScore = typeof e.score === "number" ? e.score : 0.75;
          const pct = Math.round(rawScore <= 1 ? rawScore * 100 : rawScore);
          return {
            data: {
              source: e.source,
              target: e.target,
              label: `${pct}% Match`,
              score: rawScore,
            },
            group: "edges",
          };
        }),
      ];

      setElements(cyElements);
    } catch (err: any) {
      setError(err.message || "Failed to load graph");
      console.error("Graph fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeDocId) {
      loadGraph(activeDocId);
    }
  }, [activeDocId, loadGraph]);

  // Fetch summary for active paper
  useEffect(() => {
    if (!activeDocId) return;
    setSummaryLoading(true);
    fetch(`http://127.0.0.1:8000/paper/${activeDocId}/summary`)
      .then((res) => (res.ok ? res.json() : null))
      .then((paper) => {
        if (paper) {
          setSelectedPaper(paper);
          setDocuments((prev) =>
            prev.map((d) => (d.id === paper.id ? { ...d, ...paper } : d))
          );
        }
      })
      .catch(() => undefined)
      .finally(() => setSummaryLoading(false));
  }, [activeDocId]);

  // Update cluster bounding box on pan/zoom
  const updateClusterBounds = useCallback((domain: string | null, cy: any) => {
    if (!cy || !domain) {
      setClusterBoxBounds(null);
      return;
    }
    const matchedNodes = cy.nodes().filter((n: any) => n.data("domain") === domain);
    if (matchedNodes.length === 0) {
      setClusterBoxBounds(null);
      return;
    }
    const bb = matchedNodes.renderedBoundingBox();
    const domColor = matchedNodes[0]?.data("domain_color") || DOMAIN_COLORS[domain] || "#38bdf8";
    setClusterBoxBounds({
      x: bb.x1 - 24,
      y: bb.y1 - 28,
      width: bb.w + 48,
      height: bb.h + 56,
      domain,
      color: domColor,
      count: matchedNodes.length,
    });
  }, []);

  // Handle selecting a cluster domain
  const handleSelectClusterDomain = (domain: string | null) => {
    setSelectedClusterDomain(domain);
    const cy = cyInstance.current;
    if (!cy) return;

    cy.batch(() => {
      if (!domain) {
        cy.elements().removeClass("dimmed cluster-selected highlighted-node highlighted-edge active-node");
        setClusterBoxBounds(null);
        if (activeDocId) {
          highlightNeighborhood(activeDocId, cy);
        }
        return;
      }

      const domainNodes = cy.nodes().filter((n: any) => n.data("domain") === domain);
      cy.elements().addClass("dimmed").removeClass("cluster-selected highlighted-node active-node");

      domainNodes.removeClass("dimmed").addClass("cluster-selected");
      const connectedEdges = domainNodes.connectedEdges().filter((e: any) => {
        return domainNodes.contains(e.source()) && domainNodes.contains(e.target());
      });
      connectedEdges.removeClass("dimmed").addClass("highlighted-edge");

      if (domainNodes.length > 0) {
        cy.animate({
          fit: { eles: domainNodes, padding: 80 },
          duration: 500,
        });
      }
    });

    updateClusterBounds(domain, cy);
  };

  // Apply neighborhood highlighting when active node changes
  const highlightNeighborhood = useCallback((nodeId: string, cy: any) => {
    if (!cy) return;
    cy.batch(() => {
      const selected = cy.getElementById(nodeId);
      if (!selected || selected.empty()) {
        cy.elements().removeClass("dimmed highlighted-node highlighted-edge active-node cluster-selected");
        return;
      }

      const neighborhood = selected.neighborhood();
      const connectedEdges = selected.connectedEdges();

      cy.elements().addClass("dimmed").removeClass("highlighted-node highlighted-edge active-node cluster-selected");

      selected.removeClass("dimmed").addClass("active-node");
      neighborhood.nodes().removeClass("dimmed").addClass("highlighted-node");
      connectedEdges.removeClass("dimmed").addClass("highlighted-edge");
    });
  }, []);

  const handleDocClick = (id: string) => {
    setActiveDocId(id);
    navigate(".", { state: { docId: id } });
    const cy = cyInstance.current;
    const node = cy?.getElementById(id);
    if (node?.length) {
      cy.animate({ center: { eles: node }, zoom: 1.3, duration: 400 });
      highlightNeighborhood(id, cy);
    }
    const targetPaper = documents.find((paper) => paper.id === id);
    if (targetPaper) {
      setSelectedPaper(targetPaper);
    }
    setRelationshipOpen(false);
  };

  // Graph Toolbar Actions
  const handleZoomIn = () => {
    const cy = cyInstance.current;
    if (cy) cy.animate({ zoom: cy.zoom() * 1.3, duration: 250 });
  };

  const handleZoomOut = () => {
    const cy = cyInstance.current;
    if (cy) cy.animate({ zoom: cy.zoom() * 0.75, duration: 250 });
  };

  const handleFit = () => {
    const cy = cyInstance.current;
    if (cy) cy.animate({ fit: { eles: cy.elements(), padding: 50 }, duration: 400 });
  };

  const handleCenterActive = () => {
    const cy = cyInstance.current;
    if (cy && activeDocId) {
      const node = cy.getElementById(activeDocId);
      if (node?.length) {
        cy.animate({ center: { eles: node }, zoom: 1.25, duration: 400 });
        highlightNeighborhood(activeDocId, cy);
      }
    }
  };

  const handleChangeLayout = (layoutName: string) => {
    setGraphLayout(layoutName);
    const cy = cyInstance.current;
    if (cy) {
      const layoutOptions = {
        name: layoutName,
        animate: true,
        animationDuration: 600,
        padding: 80,
        nodeDimensionsIncludeLabels: true,
        idealEdgeLength: 220,
        nodeRepulsion: 1200000,
        edgeElasticity: 0.1,
      };
      cy.layout(layoutOptions as any).run();
    }
  };

  // Re-generate summary with Gemini
  const handleRefreshSummary = async (id: string) => {
    if (!id || isRefreshingSummary) return;
    setIsRefreshingSummary(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/paper/${id}/summary?refresh=true`);
      if (!response.ok) {
        throw new Error("Failed to refresh summary with Gemini");
      }
      const data = await response.json();
      setSelectedPaper(data);
      setDocuments((prev) =>
        prev.map((d) => (d.id === data.id ? { ...d, ...data } : d))
      );
      toast.success("AI summary regenerated and saved successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to refresh summary");
    } finally {
      setIsRefreshingSummary(false);
    }
  };

  // Remove paper from library
  const handleDeletePaper = async (doc: DocumentData) => {
    if (!doc?.id) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/paper/${doc.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete paper");
      }

      toast.success(`"${formatCleanTitle(doc.title, doc.filename)}" was removed from your library.`);
      setDeleteTarget(null);

      const nextDocs = documents.filter((d) => d.id !== doc.id);
      setDocuments(nextDocs);

      if (activeDocId === doc.id) {
        if (nextDocs.length > 0) {
          handleDocClick(nextDocs[0].id);
        } else {
          setActiveDocId(null);
          setSelectedPaper(null);
          setElements([]);
          setRelationships([]);
        }
      } else if (activeDocId) {
        loadGraph(activeDocId);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete paper");
    } finally {
      setIsDeleting(false);
    }
  };

  // File upload logic for Add Paper modal
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const validFiles = selectedFiles.filter((file) => {
      const isValidType =
        file.type === "application/pdf" ||
        file.type === "text/plain" ||
        file.name.endsWith(".pdf") ||
        file.name.endsWith(".txt");
      const isValidSize = file.size <= 10 * 1024 * 1024;

      if (!isValidType) {
        toast.error(`${file.name} is not supported. Please upload PDF or TXT files only.`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name} is larger than 10MB.`);
        return false;
      }
      return true;
    });

    const newItems: UploadFileItem[] = validFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
    }));

    setUploadFiles((prev) => [...prev, ...newItems].slice(0, 3));
  };

  const removeUploadFile = (id: string) => {
    setUploadFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleProcessUpload = async () => {
    if (uploadFiles.length === 0) {
      toast.error("Please select at least one file to upload.");
      return;
    }
    if (uploadFiles.length > 3) {
      toast.error("You can upload a maximum of 3 files at a time.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      const formData = new FormData();
      for (const item of uploadFiles) {
        formData.append("files", item.file);
      }

      const response = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      toast.success(`Successfully uploaded ${uploadFiles.length} paper(s)!`);

      setUploadFiles([]);
      setIsAddModalOpen(false);

      const docs = await fetchDocuments();
      const firstNewId = result.documents?.[0]?.id;
      if (firstNewId) {
        handleDocClick(firstNewId);
      } else if (docs && docs.length > 0) {
        handleDocClick(docs[0].id);
      }
    } catch (err: unknown) {
      console.error("Upload error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to process upload");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const searchLibrary = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error("Search is unavailable");
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search is unavailable");
    }
  };

  // Cytoscape Visual Stylesheet for Crisp, Modern Light Theme
  const cytoscapeStylesheet: any = [
    {
      selector: "node",
      style: {
        label: "data(label)",
        width: 170,
        height: 48,
        shape: "round-rectangle",
        "corner-radius": "10px",
        "background-color": "#ffffff",
        "background-opacity": 1,
        "border-width": 1.8,
        "border-color": "#e2e8f0",
        "shadow-blur": 10,
        "shadow-color": "rgba(15, 23, 42, 0.08)",
        "shadow-offset-x": 0,
        "shadow-offset-y": 3,
        "shadow-opacity": 1,
        color: "#0f172a",
        "font-size": "10px",
        "font-weight": 600,
        "font-family": "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
        "text-valign": "center",
        "text-halign": "center",
        "text-wrap": "wrap",
        "text-max-width": "150px",
        "line-height": 1.25,
        "transition-property": "background-color, border-color, border-width, shadow-blur, opacity, color",
        "transition-duration": "0.25s",
      },
    },
    {
      selector: 'node[domain = "Computer Science & AI"]',
      style: {
        "border-color": "#f43f5e",
        "border-width": 2,
        "shadow-color": "rgba(244, 63, 94, 0.18)",
      },
    },
    {
      selector: 'node[domain = "Biological & Medical Sciences"]',
      style: {
        "border-color": "#10b981",
        "border-width": 2,
        "shadow-color": "rgba(16, 185, 129, 0.18)",
      },
    },
    {
      selector: 'node[domain = "Neuroscience & Cognitive Science"]',
      style: {
        "border-color": "#8b5cf6",
        "border-width": 2,
        "shadow-color": "rgba(139, 92, 246, 0.18)",
      },
    },
    {
      selector: 'node[domain = "Physics & Engineering"]',
      style: {
        "border-color": "#f59e0b",
        "border-width": 2,
        "shadow-color": "rgba(245, 158, 11, 0.18)",
      },
    },
    {
      selector: 'node[domain = "Data Systems & Web"]',
      style: {
        "border-color": "#0ea5e9",
        "border-width": 2,
        "shadow-color": "rgba(14, 165, 233, 0.18)",
      },
    },
    {
      selector: "node.active-node",
      style: {
        "border-width": 3,
        "border-color": "#e11d48",
        "background-color": "#fff1f2",
        color: "#9f1239",
        "shadow-blur": 20,
        "shadow-color": "rgba(225, 29, 72, 0.35)",
        "font-weight": 700,
        "z-index": 999,
      },
    },
    {
      selector: "node.highlighted-node",
      style: {
        "border-width": 2.5,
        "border-color": "#0284c7",
        "shadow-blur": 16,
        "shadow-color": "rgba(2, 132, 199, 0.25)",
        opacity: 1,
        "font-weight": 700,
      },
    },
    {
      selector: "node.cluster-selected",
      style: {
        "border-width": 2.5,
        "shadow-blur": 16,
        opacity: 1,
        "font-weight": 700,
      },
    },
    {
      selector: "edge",
      style: {
        label: "data(label)",
        width: 1.6,
        "line-color": "#cbd5e1",
        "line-style": "solid",
        "curve-style": "bezier",
        "target-arrow-shape": "triangle",
        "target-arrow-color": "#94a3b8",
        "arrow-scale": 0.9,
        "font-size": "9.5px",
        "font-weight": 700,
        "font-family": "ui-monospace, SFMono-Regular, Menlo, monospace",
        color: "#0369a1",
        "text-wrap": "wrap",
        "text-background-color": "#ffffff",
        "text-background-opacity": 0.98,
        "text-background-padding": "3px 7px",
        "text-background-shape": "roundrectangle",
        "text-border-color": "#cbd5e1",
        "text-border-width": 1,
        "text-border-opacity": 0.95,
        "text-rotation": "autorotate",
        "transition-property": "line-color, target-arrow-color, width, opacity",
        "transition-duration": "0.25s",
      },
    },
    {
      selector: "edge.highlighted-edge",
      style: {
        width: 2.5,
        "line-color": "#0284c7",
        "target-arrow-color": "#0284c7",
        color: "#0284c7",
        "text-background-color": "#ffffff",
        "text-border-color": "#0284c7",
        "text-border-width": 1.5,
        opacity: 1,
        "z-index": 998,
      },
    },
    {
      selector: ".dimmed",
      style: {
        opacity: 0.22,
      },
    },
  ];

  return (
    <div className="paper-workspace" style={{ display: "flex", height: "calc(100vh - 76px)", width: "100%" }}>
      {/* Sidebar */}
      <div
        className={clsx(
          "paper-workspace-sidebar transition-all duration-300 overflow-y-auto overflow-x-hidden flex flex-col",
          sidebarOpen ? "w-64" : "w-12"
        )}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          {sidebarOpen ? (
            <h2 className="paper-sidebar-title flex items-center gap-2">
              <Layers size={17} className="text-primary" />
              <span>Your Library</span>
            </h2>
          ) : null}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto">
            {/* Add Paper Quick Button */}
            <div className="p-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="paper-add-paper-btn w-full"
              >
                <Plus size={15} />
                <span>Add Paper</span>
              </button>
            </div>

            <form className="paper-search" onSubmit={searchLibrary}>
              <Search size={15} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search research library..."
              />
            </form>

            {searchResults.length > 0 && (
              <div className="paper-search-results">
                <p className="paper-sidebar-label">Search results</p>
                {searchResults.map((result) => (
                  <button
                    key={result.paper.id}
                    className="paper-search-result"
                    onClick={() => handleDocClick(result.paper.id)}
                  >
                    <strong>{formatCleanTitle(result.paper.title, result.paper.filename)}</strong>
                    <span>{result.paper.year || "Year unknown"} · {Math.round(result.score * 100)}% Match</span>
                    <small>{result.reason}</small>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between px-4 mt-4 mb-2">
              <span className="paper-sidebar-label m-0">Documents ({documents.length})</span>
            </div>

            {documents.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <p>No documents in library.</p>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-2 text-xs text-primary font-bold hover:underline"
                >
                  + Add your first paper
                </button>
              </div>
            )}

            <ul className="paper-document-list">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  onClick={() => handleDocClick(doc.id)}
                  className={clsx(
                    "paper-document-item group flex items-center justify-between",
                    activeDocId === doc.id && "active"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: doc.domain_color || DOMAIN_COLORS[doc.domain || ""] || "#f87171" }}
                    />
                    <span
                      className="paper-document-title"
                      title={doc.title || doc.filename}
                    >
                      {formatCleanTitle(doc.title, doc.filename)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="paper-document-delete-btn"
                    title="Remove paper"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(doc);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Graph Area */}
      <div className="paper-graph-area relative flex-1 flex flex-col overflow-hidden">
        {/* Top Info & Cluster Filter Bar */}
        <div className="paper-graph-heading">
          <div className="flex items-center gap-2.5">
            <span className="font-serif text-lg font-bold">Knowledge Constellation</span>
            <span className="paper-connection-badge">
              <Sparkle size={11} /> {relationships.length} Connections
            </span>
          </div>

          {/* Domain Clusters Filter Bar */}
          {availableDomains.length > 0 && (
            <div className="paper-domain-filter-bar flex items-center gap-1.5 ml-4 overflow-x-auto py-1">
              <button
                type="button"
                onClick={() => handleSelectClusterDomain(null)}
                className={clsx(
                  "paper-cluster-btn",
                  selectedClusterDomain === null && "active"
                )}
              >
                All Domains ({documents.length})
              </button>
              {availableDomains.map((dom) => (
                <button
                  key={dom.name}
                  type="button"
                  onClick={() => handleSelectClusterDomain(dom.name)}
                  className={clsx(
                    "paper-cluster-btn",
                    selectedClusterDomain === dom.name && "active"
                  )}
                  style={{
                    borderColor: selectedClusterDomain === dom.name ? dom.color : undefined,
                    color: selectedClusterDomain === dom.name ? dom.color : undefined,
                  }}
                >
                  <span className="w-2 h-2 rounded-full inline-block mr-1" style={{ backgroundColor: dom.color }} />
                  {dom.name} ({dom.count})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Floating Graph Controls Toolbar */}
        <div className="paper-graph-toolbar">
          <div className="paper-toolbar-group">
            <select
              value={graphLayout}
              onChange={(e) => handleChangeLayout(e.target.value)}
              className="paper-toolbar-select"
              title="Change Graph Layout"
            >
              <option value="cose-bilkent">Constellation Network</option>
              <option value="concentric">Concentric Rings</option>
              <option value="circle">Circular Orbit</option>
              <option value="breadthfirst">Hierarchy Tree</option>
            </select>
          </div>

          <div className="paper-toolbar-divider" />

          <button
            type="button"
            onClick={handleZoomIn}
            className="paper-toolbar-btn"
            title="Zoom In (+)"
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="paper-toolbar-btn"
            title="Zoom Out (-)"
          >
            <ZoomOut size={15} />
          </button>
          <button
            type="button"
            onClick={handleFit}
            className="paper-toolbar-btn"
            title="Fit to Screen"
          >
            <Maximize2 size={15} />
          </button>
          <button
            type="button"
            onClick={handleCenterActive}
            className="paper-toolbar-btn"
            title="Center Active Paper"
          >
            <Crosshair size={15} />
          </button>
        </div>

        {/* Transparent Domain Cluster Box Overlay */}
        {clusterBoxBounds && (
          <div
            className="paper-cluster-bounding-box pointer-events-none"
            style={{
              left: `${clusterBoxBounds.x}px`,
              top: `${clusterBoxBounds.y}px`,
              width: `${clusterBoxBounds.width}px`,
              height: `${clusterBoxBounds.height}px`,
              borderColor: clusterBoxBounds.color,
              backgroundColor: `${clusterBoxBounds.color}10`,
            }}
          >
            <div
              className="paper-cluster-box-label"
              style={{ color: clusterBoxBounds.color, borderColor: clusterBoxBounds.color }}
            >
              <Filter size={11} />
              <span>{clusterBoxBounds.domain} ({clusterBoxBounds.count} papers)</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="paper-graph-loading-overlay">
            <div className="h-7 w-7 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">Mapping research constellation...</p>
          </div>
        )}

        {error && (
          <div className="p-6 text-center text-red-600 bg-red-50/80 dark:bg-red-950/40 rounded-lg m-6 border border-red-200 dark:border-red-900">
            <p className="font-semibold">Error: {error}</p>
          </div>
        )}

        {!loading && !error && elements.length === 0 && (
          <div className="p-8 text-center text-muted-foreground mt-24">
            <p className="text-lg font-medium mb-2">No papers loaded in knowledge constellation.</p>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="paper-button paper-button-primary mt-2"
            >
              <Plus size={16} className="mr-1" /> Add Paper
            </Button>
          </div>
        )}

        {!loading && !error && elements.length > 0 && (
          <CytoscapeComponent
            zoomingEnabled={true}
            minZoom={0.1}
            maxZoom={8}
            zoom={1}
            elements={CytoscapeComponent.normalizeElements(elements)}
            layout={{
              name: graphLayout,
            } as any}
            style={{ width: "100%", height: "100%" }}
            className="paper-cytoscape-canvas"
            cy={(cy) => {
              cyInstance.current = cy;

              // Keep cluster bounding box synced on zoom/pan
              cy.on("pan zoom", () => {
                if (selectedClusterDomain) {
                  updateClusterBounds(selectedClusterDomain, cy);
                }
              });

              // Click background to reset highlights
              cy.on("tap", (event) => {
                if (event.target === cy) {
                  if (selectedClusterDomain) {
                    handleSelectClusterDomain(selectedClusterDomain);
                  } else {
                    cy.elements().removeClass("dimmed highlighted-node highlighted-edge active-node cluster-selected");
                    if (activeDocId) {
                      highlightNeighborhood(activeDocId, cy);
                    }
                  }
                }
              });

              // Click edge
              cy.on("tap", "edge", (event) => {
                const sourceId = event.target.data("source");
                const targetId = event.target.data("target");
                const relationship = relationships.find(
                  (item) => item.source_id === sourceId && item.target_id === targetId
                );
                setSelectedRelationship(relationship || null);
                setSelectedPaper(documents.find((paper) => paper.id === targetId) || null);
                const node = cy.getElementById(targetId);
                if (node.length) cy.animate({ center: { eles: node }, zoom: 1.2, duration: 400 });
              });

              // Click node
              cy.on("tap", "node", (event) => {
                const nodeId = event.target.data("id");
                const relationship = relationships.find(
                  (item) => item.source_id === nodeId || item.target_id === nodeId
                );
                setSelectedRelationship(relationship || null);
                setSelectedPaper(documents.find((paper) => paper.id === nodeId) || null);
                setRelationshipOpen(false);
                cy.animate({ center: { eles: event.target }, zoom: 1.3, duration: 400 });
                highlightNeighborhood(nodeId, cy);
              });

              if (activeDocId) {
                highlightNeighborhood(activeDocId, cy);
              }
            }}
            stylesheet={cytoscapeStylesheet}
          />
        )}
      </div>

      {/* Professional Paper Dossier Detail Panel */}
      <aside className="paper-detail-panel flex flex-col justify-between">
        {selectedPaper ? (
          <div>
            {/* Title in a Box Card */}
            <div className="paper-title-box mb-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                    style={{
                      backgroundColor:
                        selectedPaper.domain_color ||
                        (selectedPaper.domain && DOMAIN_COLORS[selectedPaper.domain]) ||
                        "#f87171",
                    }}
                  />
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{
                      color:
                        selectedPaper.domain_color ||
                        (selectedPaper.domain && DOMAIN_COLORS[selectedPaper.domain]) ||
                        "#f87171",
                    }}
                  >
                    {selectedPaper.domain || "Research Paper"}
                  </span>
                </div>
                <button
                  className="paper-detail-close"
                  onClick={() => setSelectedPaper(null)}
                  aria-label="Close paper details"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Boxed Title */}
              <h2 className="paper-dossier-title">
                {formatCleanTitle(selectedPaper.title, selectedPaper.filename)}
              </h2>

              {/* Clean Metadata Badges Row inside Box */}
              <div className="paper-dossier-meta-chips mt-3">
                {selectedPaper.year && (
                  <span className="paper-chip paper-chip-year">
                    <Calendar size={12} /> {selectedPaper.year}
                  </span>
                )}
                {selectedPaper.authors && (
                  <span className="paper-chip paper-chip-authors" title={selectedPaper.authors}>
                    <Users size={12} /> {selectedPaper.authors}
                  </span>
                )}
                {selectedPaper.filename && (
                  <span
                    className="paper-chip paper-chip-source"
                    title={`Source File: ${selectedPaper.filename}`}
                  >
                    <FileCode size={12} /> {selectedPaper.filename}
                  </span>
                )}
              </div>
            </div>

            {/* AI Summary Card with On-Demand Refresh */}
            <section className="paper-abstract-section paper-summary-card">
              <div className="paper-abstract-heading flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-primary" />
                  <p className="paper-detail-label m-0">AI Summary</p>
                </div>
                <button
                  type="button"
                  className="paper-summary-refresh-btn flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors"
                  onClick={() => handleRefreshSummary(selectedPaper.id)}
                  disabled={isRefreshingSummary || summaryLoading}
                  title="Regenerate summary with Gemini"
                >
                  <RefreshCw size={12} className={clsx(isRefreshingSummary && "animate-spin")} />
                  <span>{isRefreshingSummary ? "Refreshing..." : "Refresh"}</span>
                </button>
              </div>

              {summaryLoading || isRefreshingSummary ? (
                <div className="paper-summary-loading flex items-center gap-2 text-xs text-muted-foreground py-3">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="paper-detail-muted m-0">
                    {isRefreshingSummary
                      ? "Regenerating crisp summary with Gemini..."
                      : "Loading saved summary from cache..."}
                  </p>
                </div>
              ) : (
                <p className="paper-abstract leading-relaxed">
                  {selectedPaper.simplified_abstract ||
                    "AI summary is not available yet. Click refresh to generate one with Gemini."}
                </p>
              )}
            </section>

            {/* Why These Papers Connect Section (Percentage Match) */}
            <section className={clsx("paper-connect-section", relationshipOpen && "open")}>
              <button
                className="paper-connect-toggle"
                onClick={() => setRelationshipOpen((open) => !open)}
                aria-expanded={relationshipOpen}
              >
                <span>
                  <span className="paper-detail-label flex items-center gap-1.5">
                    <Share2 size={13} /> Why These Papers Connect
                  </span>
                  <small>
                    {selectedRelationship
                      ? `${Math.round((selectedRelationship.relationship.score || selectedRelationship.relationship.confidence || 0.75) * 100)}% Similarity Match`
                      : "Select a connected paper or edge on the graph"}
                  </small>
                </span>
                <ChevronDown size={18} />
              </button>

              {relationshipOpen && selectedRelationship && (
                <div className="paper-connect-content">
                  {/* Similarity Percentage Pill */}
                  <div className="flex items-center justify-between mb-3 bg-secondary/60 p-2.5 rounded-lg border border-border">
                    <span className="text-xs font-bold text-muted-foreground">Similarity Score:</span>
                    <span className="paper-match-badge font-mono font-bold text-xs px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/30">
                      {Math.round((selectedRelationship.relationship.score || selectedRelationship.relationship.confidence || 0.75) * 100)}% Match
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    {selectedRelationship.relationship.explanation ||
                      selectedRelationship.relationship.similarity_reason ||
                      "Strong semantic and conceptual overlap detected across these papers."}
                  </p>

                  {!!selectedRelationship.relationship.shared_concepts?.length && (
                    <div className="mb-2.5">
                      <small className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Shared Concepts
                      </small>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRelationship.relationship.shared_concepts.map((concept, idx) => (
                          <span key={idx} className="paper-concept-pill">
                            {concept}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {!!selectedRelationship.relationship.differences?.length && (
                    <div>
                      <small className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Differences
                      </small>
                      <p className="text-xs text-muted-foreground">
                        {selectedRelationship.relationship.differences.join("; ")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Remove Paper Action */}
            <div className="paper-detail-actions mt-8 pt-4 border-t border-border">
              <button
                type="button"
                className="paper-detail-remove-btn flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 p-2.5 rounded w-full justify-center transition-colors"
                onClick={() => setDeleteTarget(selectedPaper)}
              >
                <Trash2 size={14} />
                <span>Remove paper from library</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="paper-empty-detail">
            <div className="paper-empty-icon">
              <Search size={22} />
            </div>
            <h2>Select a Paper</h2>
            <p>Choose a paper from the constellation or library to inspect its dossier and connections.</p>
          </div>
        )}
      </aside>

      {/* Add Paper Modal */}
      {isAddModalOpen && (
        <div className="paper-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="paper-modal-card bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-primary" />
                <h3 className="text-lg font-bold text-foreground m-0">Add Papers to Library</h3>
              </div>
              <button
                onClick={() => {
                  if (!isUploading) {
                    setIsAddModalOpen(false);
                    setUploadFiles([]);
                  }
                }}
                disabled={isUploading}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <div className="border-2 border-dashed border-border hover:border-primary rounded-xl p-6 text-center transition-colors bg-secondary/30">
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-foreground mb-1">
                  Upload PDF or TXT Research Papers
                </h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Select up to 3 papers (max 10MB each)
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                  id="modal-file-upload"
                  disabled={isUploading}
                />
                <label htmlFor="modal-file-upload">
                  <Button
                    variant="outline"
                    className="cursor-pointer text-xs font-bold"
                    disabled={isUploading}
                    asChild
                  >
                    <span>Browse Files</span>
                  </Button>
                </label>
              </div>

              {uploadFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Selected Papers ({uploadFiles.length})
                  </p>
                  {uploadFiles.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 bg-secondary rounded-lg border border-border"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <FileText size={16} className="text-primary shrink-0" />
                        <span className="text-xs font-medium text-foreground truncate">
                          {item.file.name}
                        </span>
                      </div>
                      {!isUploading && (
                        <button
                          onClick={() => removeUploadFile(item.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isUploading && (
                <div className="mt-5 text-center">
                  <div className="h-6 w-6 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs font-semibold text-foreground">
                    Processing paper and extracting knowledge constellation...
                  </p>
                  <Progress value={uploadProgress} className="w-full mt-2" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 bg-secondary/50 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setUploadFiles([]);
                }}
                disabled={isUploading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProcessUpload}
                disabled={uploadFiles.length === 0 || isUploading}
                className="paper-button-primary text-xs"
              >
                {isUploading ? "Processing..." : `Process & Add ${uploadFiles.length ? `(${uploadFiles.length})` : ""}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Paper Confirmation Modal */}
      {deleteTarget && (
        <div className="paper-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="paper-modal-card bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground m-0">Remove Paper from Library</h3>
                  <p className="text-xs text-muted-foreground m-0">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-sm text-foreground mb-2">
                Are you sure you want to remove{" "}
                <strong>"{formatCleanTitle(deleteTarget.title, deleteTarget.filename)}"</strong> from your library?
              </p>
              <p className="text-xs text-muted-foreground">
                This will detach its relationships, remove its knowledge graph connections, and delete its saved summary.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 bg-secondary/50 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDeletePaper(deleteTarget)}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                {isDeleting ? "Removing..." : "Confirm & Remove"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphViewerPage;
