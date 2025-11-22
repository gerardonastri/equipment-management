"use client";

import { useState } from "react";

export function ShelfSelector({
  allParties,
  currentPartyId,
  selectedShelves,
  onAddShelf,
  onRemoveShelf,
}) {
  const [shelfInput, setShelfInput] = useState("");

  // Get all shelves in use
  const usedShelves = new Set();
  allParties.forEach((party) => {
    if (party.id !== currentPartyId && party.shelves) {
      party.shelves.split(",").forEach((shelf) => {
        usedShelves.add(Number.parseInt(shelf.trim()));
      });
    }
  });

  // Generate available shelves (1-50)
  const availableShelves = Array.from({ length: 50 }, (_, i) => i + 1).filter(
    (num) => !usedShelves.has(num)
  );

  const handleAddShelf = () => {
    const shelfNumber = Number.parseInt(shelfInput);
    if (shelfNumber && !selectedShelves.includes(shelfNumber)) {
      onAddShelf(shelfNumber);
      setShelfInput("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex space-x-2">
        <select
          value={shelfInput}
          onChange={(e) => setShelfInput(e.target.value)}
          className="flex-1 px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Seleziona scaffale disponibile...</option>
          {availableShelves.map((shelf) => (
            <option key={shelf} value={shelf}>
              #{shelf}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAddShelf}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Aggiungi
        </button>
      </div>

      {selectedShelves.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedShelves.map((shelf) => (
            <span
              key={shelf}
              className="inline-flex items-center space-x-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
            >
              <span>#{shelf}</span>
              <button
                type="button"
                onClick={() => onRemoveShelf(shelf)}
                className="hover:text-primary/70"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Scaffali disponibili: {availableShelves.length}/{50}
      </p>
    </div>
  );
}
