"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Upload, FileText, Trash2, Database, Loader2, AlertTriangle } from "lucide-react"
import KnowledgeBaseItem from "@/components/knowledge-base-item"

type FileItem = {
  id: string
  name: string
  size: number
  type: string
  status: "uploading" | "processing" | "complete" | "error"
  error?: string
}

type KnowledgeBaseFile = {
  id: string
  filename: string
  created_at: string
  size: string
}

export default function KnowledgeBasePage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<KnowledgeBaseFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState("")
  const [sortAsc, setSortAsc] = useState(true)
  const [activeTab, setActiveTab] = useState<'transcripts' | 'literature'>('transcripts')

  useEffect(() => {
    fetchKnowledgeBase()
  }, [])

  const fetchKnowledgeBase = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/knowledge-base/list")

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || `Error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setKnowledgeBaseFiles(data.files)
      } else {
        throw new Error(data.error || "Failed to fetch knowledge base")
      }
    } catch (error: any) {
      console.error("Error fetching knowledge base:", error)
      setError(error.message || "Failed to fetch knowledge base")
      toast({
        title: "Error",
        description: error.message || "Failed to fetch knowledge base",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const newFiles: FileItem[] = Array.from(e.target.files).map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: "uploading",
    }))

    setFiles((prev) => [...prev, ...newFiles])

    // Process each file
    Array.from(e.target.files).forEach(async (file, index) => {
      const fileId = newFiles[index].id

      try {
        // Create form data
        const formData = new FormData()
        formData.append("file", file)

        // Update status to processing
        setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "processing" } : f)))

        // Upload file using API route
        const response = await fetch("/api/knowledge-base/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || `Error: ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          // Update status to complete
          setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "complete" } : f)))
        } else {
          throw new Error(data.error || "Upload failed")
        }
      } catch (error: any) {
        console.error("Error uploading file:", error)
        // Update status to error
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, status: "error", error: error.message || "Upload failed" } : f)),
        )
      }
    })
  }

  const handleSelectFilesClick = () => {
    // Programmatically click the hidden file input
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleUpload = async () => {
    setIsUploading(true)
    try {
      await fetchKnowledgeBase()
      toast({
        title: "Knowledge base updated",
        description: `${files.length} files have been processed and added to your knowledge base.`,
      })
      setFiles([])
    } catch (error: any) {
      console.error("Error updating knowledge base:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update knowledge base",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id))
  }

  const transcripts = knowledgeBaseFiles.filter(
    (file) =>
      file.filename.toLowerCase().startsWith('day') ||
      file.filename.toLowerCase().includes('transcript')
  )
  const literature = knowledgeBaseFiles.filter(
    (file) =>
      !(
        file.filename.toLowerCase().startsWith('day') ||
        file.filename.toLowerCase().includes('transcript')
      )
  )

  const filesToShow = (activeTab === 'transcripts' ? transcripts : literature)
    .filter((file) => file.filename.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sortAsc ? a.filename.localeCompare(b.filename) : b.filename.localeCompare(a.filename)
    )

  const renderKnowledgeBaseContent = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-sm text-muted-foreground">
            Total files = {knowledgeBaseFiles.length} file{knowledgeBaseFiles.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant={activeTab === 'transcripts' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('transcripts')}
          >
            Transcripts
          </Button>
          <Button
            variant={activeTab === 'literature' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('literature')}
          >
            Literature
          </Button>
          <Input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs ml-4"
          />
          <Button variant="outline" size="sm" onClick={() => setSortAsc((s) => !s)}>
            Sort {sortAsc ? "A-Z" : "Z-A"}
          </Button>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-muted-foreground mb-2">Error loading knowledge base</p>
            <p className="text-sm text-red-500 mb-4">{error}</p>
            <Button onClick={fetchKnowledgeBase} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        ) : filesToShow.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No files in this section. Upload some files to get started.</p>
          </div>
        ) : (
          filesToShow.map((file) => (
            <KnowledgeBaseItem
              key={file.id}
              id={file.id}
              name={file.filename}
              date={file.created_at}
              size={file.size}
              onDelete={fetchKnowledgeBase}
            />
          ))
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-2 sm:px-4">
      <h1 className="text-2xl font-bold mb-6">Knowledge Base Management</h1>

      <Tabs defaultValue="upload">
        <TabsList className="mb-4 flex flex-col sm:flex-row gap-2">
          <TabsTrigger value="upload" className="flex-1">Upload Files</TabsTrigger>
          <TabsTrigger value="manage" className="flex-1">Manage Knowledge Base</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-4 sm:p-8 text-center">
                <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Drag and drop files here</h3>
                <p className="text-sm text-muted-foreground mb-4">Supported formats: TXT, CSV, JSON</p>

                {/* Hidden file input */}
                <Input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Direct button click handler */}
                <Button type="button" onClick={handleSelectFilesClick}
                  className="w-full sm:w-auto mt-2 sm:mt-0">
                  <FileText className="h-4 w-4 mr-2" />
                  Select Files
                </Button>
              </div>

              {files.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Selected Files</h3>
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div key={file.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-2">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium break-all max-w-xs sm:max-w-none">{file.name}</p>
                            <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                          {file.status === "uploading" && (
                            <span className="text-sm text-muted-foreground flex items-center">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading...
                            </span>
                          )}
                          {file.status === "processing" && (
                            <span className="text-sm text-muted-foreground flex items-center">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing...
                            </span>
                          )}
                          {file.status === "complete" && <span className="text-sm text-green-500">Ready</span>}
                          {file.status === "error" && <span className="text-sm text-red-500">{file.error}</span>}
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveFile(file.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || files.every((f) => f.status !== "complete")}
                    className="w-full"
                  >
                    {isUploading ? "Processing..." : "Process and Add to Knowledge Base"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Current Knowledge Base
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {renderKnowledgeBaseContent()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
