"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Plus,
  Search,
  Edit,
  Trash2,
  MapPin,
  User,
  Package,
} from "lucide-react";
import Navbar from "@/components/navbar";

export default function PartiesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newParty, setNewParty] = useState({
    name: "",
    date: "",
    location: "",
    responsible: "",
    shelves: [],
    notes: "",
  });

  // Mock parties data
  const parties = [
    {
      id: 1,
      name: "Matrimonio Villa Rosa",
      date: "2024-01-15",
      location: "Villa Rosa, Milano",
      responsible: "Marco Rossi",
      shelves: ["A-12", "B-05", "C-08"],
      status: "active",
      notes: "Matrimonio elegante con 150 invitati",
    },
    {
      id: 2,
      name: "Compleanno 18 anni Sara",
      date: "2024-01-20",
      location: "Sala Feste Aurora, Roma",
      responsible: "Luca Bianchi",
      shelves: ["D-03", "E-11"],
      status: "pending",
      notes: "Festa a tema anni 80",
    },
    {
      id: 3,
      name: "Evento Aziendale TechCorp",
      date: "2024-01-25",
      location: "Hotel Excelsior, Napoli",
      responsible: "Sara Verdi",
      shelves: ["F-07", "G-14", "H-02", "I-09"],
      status: "completed",
      notes: "Evento corporate con 300 partecipanti",
    },
  ];

  const availableShelves = [
    "A-01",
    "A-02",
    "B-01",
    "B-02",
    "C-01",
    "C-02",
    "D-01",
    "D-02",
  ];
  const users = [
    "Marco Rossi",
    "Luca Bianchi",
    "Sara Verdi",
    "Anna Neri",
    "Paolo Blu",
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "status-active";
      case "pending":
        return "status-pending";
      case "completed":
        return "status-completed";
      default:
        return "status-pending";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "Attiva";
      case "pending":
        return "In Preparazione";
      case "completed":
        return "Completata";
      default:
        return "Sconosciuto";
    }
  };

  const handleAddParty = (e) => {
    e.preventDefault();
    // Mock add party - in real app this would call API
    console.log("Adding party:", newParty);
    setShowAddForm(false);
    setNewParty({
      name: "",
      date: "",
      location: "",
      responsible: "",
      shelves: [],
      notes: "",
    });
  };

  const filteredParties = parties.filter(
    (party) =>
      party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      party.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      party.responsible.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <main className="containerMod py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Gestione Feste
              </h1>
              <p className="text-muted-foreground">
                Crea e gestisci tutte le feste
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nuova Festa</span>
            </button>
          </div>

          {/* Search */}
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cerca feste..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Parties List */}
          <div className="grid gap-6">
            {filteredParties.map((party) => (
              <motion.div
                key={party.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card p-6 rounded-xl border border-border card-hover"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-xl font-semibold text-foreground">
                        {party.name}
                      </h3>
                      <span className={getStatusColor(party.status)}>
                        {getStatusText(party.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Data:</span>
                        <span className="font-medium text-foreground">
                          {party.date}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Luogo:</span>
                        <span className="font-medium text-foreground">
                          {party.location}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Responsabile:
                        </span>
                        <span className="font-medium text-foreground">
                          {party.responsible}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Scaffali:</span>
                        <span className="font-medium text-foreground">
                          {party.shelves.join(", ")}
                        </span>
                      </div>
                    </div>

                    {party.notes && (
                      <p className="text-sm text-muted-foreground mt-3 italic">
                        {party.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-muted-foreground hover:text-danger hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Add Party Modal */}
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-card p-6 rounded-xl border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  Crea Nuova Festa
                </h3>

                <form onSubmit={handleAddParty} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Nome Festa
                      </label>
                      <input
                        type="text"
                        value={newParty.name}
                        onChange={(e) =>
                          setNewParty((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Data
                      </label>
                      <input
                        type="date"
                        value={newParty.date}
                        onChange={(e) =>
                          setNewParty((prev) => ({
                            ...prev,
                            date: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Luogo
                    </label>
                    <input
                      type="text"
                      value={newParty.location}
                      onChange={(e) =>
                        setNewParty((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Responsabile
                    </label>
                    <select
                      value={newParty.responsible}
                      onChange={(e) =>
                        setNewParty((prev) => ({
                          ...prev,
                          responsible: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    >
                      <option value="">Seleziona responsabile...</option>
                      {users.map((user) => (
                        <option key={user} value={user}>
                          {user}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Scaffali Assegnati
                    </label>
                    <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto border border-input rounded-lg p-3">
                      {availableShelves.map((shelf) => (
                        <label
                          key={shelf}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="checkbox"
                            checked={newParty.shelves.includes(shelf)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewParty((prev) => ({
                                  ...prev,
                                  shelves: [...prev.shelves, shelf],
                                }));
                              } else {
                                setNewParty((prev) => ({
                                  ...prev,
                                  shelves: prev.shelves.filter(
                                    (s) => s !== shelf
                                  ),
                                }));
                              }
                            }}
                            className="rounded border-input"
                          />
                          <span className="text-sm">{shelf}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Note
                    </label>
                    <textarea
                      value={newParty.notes}
                      onChange={(e) =>
                        setNewParty((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      rows="3"
                      placeholder="Note aggiuntive..."
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-surface transition-colors"
                    >
                      Annulla
                    </button>
                    <button type="submit" className="flex-1 btn-primary">
                      Crea Festa
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
