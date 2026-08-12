"use client";

export default function LoadingScreen({ shelfId, isVirtualShelf }) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">
          {!shelfId
            ? "Caricamento..."
            : `Caricamento festa per scaffale ${isVirtualShelf ? "virtuale " : ""}${shelfId}...`}
        </p>
      </div>
    </div>
  );
}
