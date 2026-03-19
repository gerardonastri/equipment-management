"use client";

import { useState } from "react";

// 36 scaffali numerici (1-36) + 12 scaffali con lettera (A-L)
const NUMERIC_SHELVES = Array.from({ length: 36 }, (_, i) => String(i + 1));
const LETTER_SHELVES = Array.from({ length: 12 }, (_, i) =>
  String.fromCharCode(65 + i) // A, B, C, ..., L
);
const ALL_SHELVES = [...NUMERIC_SHELVES, ...LETTER_SHELVES]; // 48 totali

export function ShelfSelector({
  allParties,
  currentPartyId,
  selectedShelves,
  onAddShelf,
  onRemoveShelf,
}) {
  const [shelfInput, setShelfInput] = useState("");

  // Uno scaffale è "occupato" solo se la festa NON è scaricato_scaffale
  const usedShelves = new Set();
  allParties.forEach((party) => {
    if (party.id !== currentPartyId && party.stato !== "scaricato_scaffale" && party.shelves) {
      party.shelves.split(",").forEach((s) => {
        const val = s.trim();
        if (val) usedShelves.add(val);
      });
    }
  });

  const availableShelves = ALL_SHELVES.filter((s) => !usedShelves.has(s));
  const availableNumeric = availableShelves.filter((s) => !isNaN(Number(s)));
  const availableLetters = availableShelves.filter((s) => isNaN(Number(s)));

  const handleAddShelf = () => {
    if (shelfInput && !selectedShelves.includes(shelfInput)) {
      onAddShelf(shelfInput);
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
          {availableNumeric.length > 0 && (
            <optgroup label="Numerici (1–36)">
              {availableNumeric.map((shelf) => (
                <option key={shelf} value={shelf}>#{shelf}</option>
              ))}
            </optgroup>
          )}
          {availableLetters.length > 0 && (
            <optgroup label="Lettere (A–L)">
              {availableLetters.map((shelf) => (
                <option key={shelf} value={shelf}>#{shelf}</option>
              ))}
            </optgroup>
          )}
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
        Scaffali disponibili: {availableShelves.length}/48 — numerici 1–36, lettere A–L
        (gli scaffali delle feste completate sono automaticamente liberati)
      </p>
    </div>
  );
}