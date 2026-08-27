import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
interface FileItem {
  file: File;
  id: string;
  status: "pending" | "processing" | "completed" | "error";
}

const UploadPage: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files || []);
      const validFiles = selectedFiles.filter((file) => {
        const isValidType =
          file.type === "application/pdf" || file.type === "text/plain";
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit

        if (!isValidType) {
          toast.error(
            `${file.name} is not a supported file type. Please upload PDF or TXT files only.`
          );
          return false;
        }

        if (!isValidSize) {
          toast.error(
            `${file.name} is larger than 10MB. Please choose a smaller file.`
          );
          return false;
        }

        return true;
      });

      const newFiles: FileItem[] = validFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: "pending",
      }));

      setFiles((prev) => [...prev, ...newFiles]);
    },
    []
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  }, []);

  const processFiles = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file to process.");
      return;
    }
    if(files.length > 3) {
      toast.error("You can upload a maximum of 3 files at a time.");
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      setFiles((prev) =>
        prev.map((file) => ({ ...file, status: "processing" as const }))
      );

      // Simulate progress until request completes
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 500);

      // Only handle one file at a time (backend /upload expects single)
      const formData = new FormData();
      for (const fileItem of files) {
        formData.append("files", fileItem.file);
      }

      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();

      setFiles((prev) =>
        prev.map((file) => ({ ...file, status: "completed" as const }))
      );
      console.log("Upload result:", result);
      toast.success(
        `Successfully processed ${
          files.length
        } document(s). Preview: ${result.documents[0].preview.slice(0, 100)}...`
      );

      setTimeout(() => {
        navigate("/graph",{
          state: { docId: result.documents[0].id }
        });
      }, 1500);
    } catch (error: unknown) {
      console.error("Processing error:", error);
      setFiles((prev) =>
        prev.map((file) => ({ ...file, status: "error" as const }))
      );
      if(error instanceof Error && error.message.includes("NetworkError")) {
        toast.error("Network error: Please ensure the backend server is running.");
      } else {
        toast.error("There was an error processing your documents. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };



  const getStatusIcon = (status: FileItem["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case "processing":
        return (
          <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Upload & Process Documents
          </h1>
          <p className="text-lg text-gray-600">
            Upload your PDF or TXT files to extract entities and build your
            knowledge graph
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Choose files to upload
              </h3>
              <p className="text-gray-600 mb-4">
                Select PDF or TXT files (max 10MB each)
              </p>
              <input
                type="file"
                multiple
                max={3}
                accept=".pdf,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={isProcessing}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  disabled={isProcessing}
                  asChild
                >
                  <span>Select Files</span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        {files.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Selected Files ({files.length})
              </h3>
              <div className="space-y-3">
                {files.map((fileItem) => (
                  <div
                    key={fileItem.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {fileItem.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(fileItem.file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(fileItem.status)}
                      {!isProcessing && fileItem.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(fileItem.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isProcessing && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="mb-4">
                  <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Processing with AI...
                  </h3>
                  <p className="text-gray-600">
                    Extracting entities and relationships from your documents
                  </p>
                </div>
                <Progress
                  value={progress}
                  className="w-full max-w-md mx-auto"
                />
                <p className="text-sm text-gray-500 mt-2">
                  {Math.round(progress)}% complete
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Button
            onClick={processFiles}
            disabled={files.length === 0 || isProcessing}
            size="lg"
            className="bg-blue-800 hover:bg-blue-700 text-white px-8 py-3"
          >
            {isProcessing ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Process Documents
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
