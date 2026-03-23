"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type AppState = "idle" | "uploading" | "processing" | "done" | "error";

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload an image file.");
      setState("error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Image must be under 10MB.");
      setState("error");
      return;
    }

    setState("uploading");
    setErrorMessage("");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setBeforeImage(dataUrl);
      setState("processing");

      try {
        const base64 = dataUrl.split(",")[1];
        const res = await fetch("/api/transform", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mimeType: file.type }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || "Transformation failed");
        }

        const resultUrl = `data:${data.mimeType};base64,${data.image}`;
        setAfterImage(resultUrl);
        setState("done");
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong"
        );
        setState("error");
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // Auto-download when transformation completes
  useEffect(() => {
    if (state === "done" && afterImage) {
      const link = document.createElement("a");
      link.href = afterImage;
      link.download = `pool-visualized-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [state, afterImage]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleSliderMove = useCallback(
    (clientX: number) => {
      if (!isDragging || !comparisonRef.current) return;
      const rect = comparisonRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      setSliderPos((x / rect.width) * 100);
    },
    [isDragging]
  );

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => handleSliderMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) =>
      handleSliderMove(e.touches[0].clientX);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleSliderMove]);

  const reset = () => {
    setState("idle");
    setBeforeImage(null);
    setAfterImage(null);
    setErrorMessage("");
    setSliderPos(50);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f1628] to-[#0a0a0f] flex flex-col items-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-3">
          Pool Visualizer
        </h1>
        <p className="text-gray-400 text-lg">
          Transform 3D renderings into photorealistic images with AI
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-3xl">
        {/* Upload State */}
        {(state === "idle" || state === "error") && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="relative group cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50 group-hover:opacity-75" />
            <div className="relative border-2 border-dashed border-white/10 hover:border-cyan-500/40 rounded-2xl p-16 text-center transition-all duration-300 bg-white/[0.02] backdrop-blur-sm">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-cyan-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-xl text-white/80 mb-2">
                Drop your 3D rendering here
              </p>
              <p className="text-sm text-gray-500">
                or click to browse &middot; PNG, JPG up to 10MB
              </p>
              {state === "error" && (
                <p className="mt-4 text-red-400 text-sm">{errorMessage}</p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        )}

        {/* Processing State */}
        {(state === "uploading" || state === "processing") && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl blur-xl" />
            <div className="relative rounded-2xl overflow-hidden bg-white/[0.02] backdrop-blur-sm border border-white/5">
              {beforeImage && (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={beforeImage}
                    alt="Before"
                    className="w-full opacity-40"
                  />
                  <div className="absolute inset-0 shimmer rounded-2xl" />
                </div>
              )}
              <div className="p-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-cyan-400 pulse-ring" />
                  <p className="text-lg text-white/80">
                    {state === "uploading"
                      ? "Uploading image..."
                      : "AI is transforming your rendering..."}
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  This may take 15-30 seconds
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Result State */}
        {state === "done" && beforeImage && afterImage && (
          <div>
            {/* Before/After Comparison Slider */}
            <div
              ref={comparisonRef}
              className="relative rounded-2xl overflow-hidden cursor-col-resize select-none border border-white/10"
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
            >
              {/* After image (full width background) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={afterImage}
                alt="After - Photorealistic"
                className="w-full block"
                draggable={false}
              />

              {/* Before image (clipped) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPos}%` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={beforeImage}
                  alt="Before - 3D Rendering"
                  className="w-full h-full object-cover"
                  style={{
                    width: comparisonRef.current
                      ? `${comparisonRef.current.offsetWidth}px`
                      : "100%",
                    maxWidth: "none",
                  }}
                  draggable={false}
                />
              </div>

              {/* Slider line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-gray-800"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                    />
                  </svg>
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white/80 font-medium">
                3D Rendering
              </div>
              <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white/80 font-medium">
                AI Photorealistic
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-6 justify-center">
              <button
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = afterImage;
                  link.download = `pool-visualized-${Date.now()}.png`;
                  link.click();
                }}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
              >
                Download Again
              </button>
              <button
                onClick={reset}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl font-medium transition-all duration-200 border border-white/10"
              >
                Try Another Image
              </button>
            </div>

            <p className="text-center text-gray-500 text-sm mt-4">
              Image auto-downloaded. Drag the slider to compare before &amp; after.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
