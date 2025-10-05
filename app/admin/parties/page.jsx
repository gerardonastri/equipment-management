"use client";

import { useState } from "react";
import useSWR from "swr";
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
  Users,
  Clock,
  Truck,
  Home,
} from "lucide-react";
import Navbar from "@/components/navbar";
import {
  getPartiesData,
  getPartyMaterials,
  createParty,
  deleteParty,
  assignMaterial,
  removeMaterial,
  updateParty,
} from "./actions";

const fetcher = () => getPartiesData();

export default function PartiesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editParty, setEditParty] = useState(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedParty, setSelectedParty] = useState(null);
  const [partyMaterials, setPartyMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [newParty, setNewParty] = useState({
    nome: "",
    data: "",
    luogo: "",
    animatore_id: "",
    magazziniere_id: "",
    stato: "iniziale",
    note: "",
    shelves: [],
  });
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [shelfInput, setShelfInput] = useState("");

  const { data, error, isLoading, mutate } = useSWR("parties-data", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const parties = data?.parties || [];
  const users = data?.users || [];
  const macroCategories = data?.macroCategories || [];

  const loadPartyMaterialsData = async (partyId) => {
    setLoadingMaterials(true);
    try {
      const materials = await getPartyMaterials(partyId);
      setPartyMaterials(materials);
    } catch (error) {
      console.error("Error loading party materials:", error);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const getStatusColor = (stato) => {
    switch (stato) {
      case "iniziale":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "caricato_scaffale":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "caricato_furgone":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "scaricato_furgone":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "scaricato_scaffale":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusText = (stato) => {
    switch (stato) {
      case "iniziale":
        return "Iniziale";
      case "caricato_scaffale":
        return "Caricato nello Scaffale";
      case "caricato_furgone":
        return "Caricato nel Furgone";
      case "scaricato_furgone":
        return "Scaricato dal Furgone";
      case "scaricato_scaffale":
        return "Ritornato al deposito";
      default:
        return "Sconosciuto";
    }
  };

  const getStatusIcon = (stato) => {
    switch (stato) {
      case "iniziale":
        return <Clock className="w-4 h-4" />;
      case "caricato_furgone":
        return <Truck className="w-4 h-4" />;
      case "scaricato_furgone":
        return <Package className="w-4 h-4" />;
      case "scaricato_scaffale":
        return <Home className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handleAddParty = async (e) => {
    e.preventDefault();
    try {
      await createParty({
        ...newParty,
        selectedMaterials,
      });

      mutate(); // Revalidate SWR cache
      setShowAddForm(false);
      setNewParty({
        nome: "",
        data: "",
        luogo: "",
        animatore_id: "",
        magazziniere_id: "",
        stato: "iniziale",
        note: "",
        shelves: [],
      });
      setSelectedMaterials([]);
      setShelfInput("");
    } catch (error) {
      console.error("Error creating party:", error);
      alert("Errore nella creazione della festa");
    }
  };

  const handleEditParty = (party) => {
    setEditParty({
      ...party,
      shelves: party.shelves
        ? party.shelves.split(",").map((s) => Number.parseInt(s.trim()))
        : [],
    });
    setShowEditForm(true);
  };

  const handleUpdateParty = async (e) => {
    e.preventDefault();
    try {
      await updateParty(editParty.id, editParty);
      mutate(); // Revalidate SWR cache
      setShowEditForm(false);
      setEditParty(null);
    } catch (error) {
      console.error("Error updating party:", error);
      alert("Errore nell'aggiornamento della festa");
    }
  };

  const handleAssignMaterial = async (macroId) => {
    try {
      await assignMaterial(selectedParty.id, macroId);
      await loadPartyMaterialsData(selectedParty.id);
      mutate(); // Revalidate SWR cache
    } catch (error) {
      console.error("Error assigning material:", error);
      alert("Errore nell'assegnazione del materiale");
    }
  };

  const handleRemoveMaterial = async (macroId) => {
    try {
      await removeMaterial(selectedParty.id, macroId);
      await loadPartyMaterialsData(selectedParty.id);
      mutate(); // Revalidate SWR cache
    } catch (error) {
      console.error("Error removing material:", error);
      alert("Errore nella rimozione del materiale");
    }
  };

  const handleDeleteParty = async (partyId) => {
    if (!confirm("Sei sicuro di voler eliminare questa festa?")) return;

    try {
      await deleteParty(partyId);
      mutate(); // Revalidate SWR cache
    } catch (error) {
      console.error("Error deleting party:", error);
      alert("Errore nell'eliminazione della festa");
    }
  };

  const openMaterialModal = async (party) => {
    setSelectedParty(party);
    setShowMaterialModal(true);
    await loadPartyMaterialsData(party.id);
  };

  const toggleMaterialSelection = (materialId) => {
    setSelectedMaterials((prev) =>
      prev.includes(materialId)
        ? prev.filter((id) => id !== materialId)
        : [...prev, materialId]
    );
  };

  const addShelf = () => {
    const shelfNumber = Number.parseInt(shelfInput);
    if (shelfNumber && !newParty.shelves.includes(shelfNumber)) {
      setNewParty((prev) => ({
        ...prev,
        shelves: [...prev.shelves, shelfNumber].sort((a, b) => a - b),
      }));
      setShelfInput("");
    }
  };

  const addShelfToEdit = () => {
    const shelfNumber = Number.parseInt(shelfInput);
    if (shelfNumber && !editParty.shelves.includes(shelfNumber)) {
      setEditParty((prev) => ({
        ...prev,
        shelves: [...prev.shelves, shelfNumber].sort((a, b) => a - b),
      }));
      setShelfInput("");
    }
  };

  const removeShelf = (shelfToRemove) => {
    setNewParty((prev) => ({
      ...prev,
      shelves: prev.shelves.filter((shelf) => shelf !== shelfToRemove),
    }));
  };

  const removeShelfFromEdit = (shelfToRemove) => {
    setEditParty((prev) => ({
      ...prev,
      shelves: prev.shelves.filter((shelf) => shelf !== shelfToRemove),
    }));
  };

  const filteredParties = parties.filter(
    (party) =>
      party.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      party.luogo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (party.animatore?.nome || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (party.magazziniere?.nome || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <main className="containerMod py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Caricamento feste...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <main className="containerMod py-8">
          <div className="text-center text-danger">
            Errore nel caricamento dei dati
          </div>
        </main>
      </div>
    );
  }

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
                        {party.nome}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${getStatusColor(
                          party.stato
                        )}`}
                      >
                        {getStatusIcon(party.stato)}
                        <span>{getStatusText(party.stato)}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Data:</span>
                        <span className="font-medium text-foreground">
                          {new Date(party.data).toLocaleDateString("it-IT")}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Luogo:</span>
                        <span className="font-medium text-foreground">
                          {party.luogo}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Animatore:
                        </span>
                        <span className="font-medium text-foreground">
                          {party.animatore?.nome || "Non assegnato"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Magazziniere:
                        </span>
                        <span className="font-medium text-foreground">
                          {party.magazziniere?.nome || "Non assegnato"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Scaffali:</span>
                        <span className="font-medium text-foreground">
                          {party.shelves
                            ? party.shelves
                                .split(",")
                                .map((s) => `#${s}`)
                                .join(", ")
                            : "Nessuno"}
                        </span>
                      </div>
                    </div>

                    {party.note && (
                      <p className="text-sm text-muted-foreground mt-3 italic">
                        {party.note}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openMaterialModal(party)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors"
                      title="Gestisci Materiale"
                    >
                      <Package className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditParty(party)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors"
                      title="Modifica Festa"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteParty(party.id)}
                      className="p-2 text-muted-foreground hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
                    >
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
                        value={newParty.nome}
                        onChange={(e) =>
                          setNewParty((prev) => ({
                            ...prev,
                            nome: e.target.value,
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
                        value={newParty.data}
                        onChange={(e) =>
                          setNewParty((prev) => ({
                            ...prev,
                            data: e.target.value,
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
                      value={newParty.luogo}
                      onChange={(e) =>
                        setNewParty((prev) => ({
                          ...prev,
                          luogo: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Animatore
                      </label>
                      <select
                        value={newParty.animatore_id}
                        onChange={(e) =>
                          setNewParty((prev) => ({
                            ...prev,
                            animatore_id: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Seleziona animatore...</option>
                        {users
                          .filter(
                            (user) =>
                              user.ruolo === "animatore" ||
                              user.ruolo === "amministratore"
                          )
                          .map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.nome}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Magazziniere
                      </label>
                      <select
                        value={newParty.magazziniere_id}
                        onChange={(e) =>
                          setNewParty((prev) => ({
                            ...prev,
                            magazziniere_id: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Seleziona magazziniere...</option>
                        {users
                          .filter(
                            (user) =>
                              user.ruolo === "magazziniere" ||
                              user.ruolo === "amministratore"
                          )
                          .map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.nome}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Stato
                    </label>
                    <select
                      value={newParty.stato}
                      onChange={(e) =>
                        setNewParty((prev) => ({
                          ...prev,
                          stato: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="iniziale">Iniziale</option>
                      <option value="caricato_furgone">
                        Caricato nel Furgone
                      </option>
                      <option value="scaricato_furgone">
                        Scaricato dal Furgone
                      </option>
                      <option value="scaricato_scaffale">
                        Scaricato da Scaffale
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Note
                    </label>
                    <textarea
                      value={newParty.note}
                      onChange={(e) =>
                        setNewParty((prev) => ({
                          ...prev,
                          note: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      rows="3"
                      placeholder="Note aggiuntive..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      Materiale da Assegnare
                    </label>
                    <div className="border border-border rounded-lg p-4 max-h-48 overflow-y-auto">
                      {macroCategories.length > 0 ? (
                        <div className="space-y-2">
                          {macroCategories.map((macro) => (
                            <label
                              key={macro.id}
                              className="flex items-center space-x-3 cursor-pointer hover:bg-surface p-2 rounded-lg transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedMaterials.includes(macro.id)}
                                onChange={() =>
                                  toggleMaterialSelection(macro.id)
                                }
                                className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-ring"
                              />
                              <span className="text-sm font-medium text-foreground">
                                {macro.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nessuna macro-categoria disponibile. Crea prima del
                          materiale nell'inventario.
                        </p>
                      )}
                    </div>
                    {selectedMaterials.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {selectedMaterials.length} macro-categorie selezionate
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Scaffali
                    </label>
                    <div className="space-y-3">
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          min="1"
                          value={shelfInput}
                          onChange={(e) => setShelfInput(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" &&
                            (e.preventDefault(), addShelf())
                          }
                          className="flex-1 px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Numero scaffale..."
                        />
                        <button
                          type="button"
                          onClick={addShelf}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Aggiungi
                        </button>
                      </div>

                      {newParty.shelves.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {newParty.shelves.map((shelf) => (
                            <span
                              key={shelf}
                              className="inline-flex items-center space-x-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                            >
                              <span>#{shelf}</span>
                              <button
                                type="button"
                                onClick={() => removeShelf(shelf)}
                                className="hover:text-primary/70"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Aggiungi uno o più scaffali per questa festa
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setSelectedMaterials([]);
                        setShelfInput("");
                      }}
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

          {/* Edit Party Modal */}
          {showEditForm && editParty && (
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
                  Modifica Festa
                </h3>

                <form onSubmit={handleUpdateParty} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Nome Festa
                      </label>
                      <input
                        type="text"
                        value={editParty.nome}
                        onChange={(e) =>
                          setEditParty((prev) => ({
                            ...prev,
                            nome: e.target.value,
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
                        value={editParty.data}
                        onChange={(e) =>
                          setEditParty((prev) => ({
                            ...prev,
                            data: e.target.value,
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
                      value={editParty.luogo}
                      onChange={(e) =>
                        setEditParty((prev) => ({
                          ...prev,
                          luogo: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Animatore
                      </label>
                      <select
                        value={editParty.animatore_id || ""}
                        onChange={(e) =>
                          setEditParty((prev) => ({
                            ...prev,
                            animatore_id: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Seleziona animatore...</option>
                        {users
                          .filter(
                            (user) =>
                              user.ruolo === "animatore" ||
                              user.ruolo === "amministratore"
                          )
                          .map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.nome}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Magazziniere
                      </label>
                      <select
                        value={editParty.magazziniere_id || ""}
                        onChange={(e) =>
                          setEditParty((prev) => ({
                            ...prev,
                            magazziniere_id: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Seleziona magazziniere...</option>
                        {users
                          .filter(
                            (user) =>
                              user.ruolo === "magazziniere" ||
                              user.ruolo === "amministratore"
                          )
                          .map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.nome}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Stato
                    </label>
                    <select
                      value={editParty.stato}
                      onChange={(e) =>
                        setEditParty((prev) => ({
                          ...prev,
                          stato: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="iniziale">Iniziale</option>
                      <option value="caricato_furgone">
                        Caricato nel Furgone
                      </option>
                      <option value="scaricato_furgone">
                        Scaricato dal Furgone
                      </option>
                      <option value="scaricato_scaffale">
                        Scaricato da Scaffale
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Note
                    </label>
                    <textarea
                      value={editParty.note || ""}
                      onChange={(e) =>
                        setEditParty((prev) => ({
                          ...prev,
                          note: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      rows="3"
                      placeholder="Note aggiuntive..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Scaffali
                    </label>
                    <div className="space-y-3">
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          min="1"
                          value={shelfInput}
                          onChange={(e) => setShelfInput(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" &&
                            (e.preventDefault(), addShelfToEdit())
                          }
                          className="flex-1 px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Numero scaffale..."
                        />
                        <button
                          type="button"
                          onClick={addShelfToEdit}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Aggiungi
                        </button>
                      </div>

                      {editParty.shelves.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {editParty.shelves.map((shelf) => (
                            <span
                              key={shelf}
                              className="inline-flex items-center space-x-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                            >
                              <span>#{shelf}</span>
                              <button
                                type="button"
                                onClick={() => removeShelfFromEdit(shelf)}
                                className="hover:text-primary/70"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Aggiungi uno o più scaffali per questa festa
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditForm(false);
                        setEditParty(null);
                        setShelfInput("");
                      }}
                      className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-surface transition-colors"
                    >
                      Annulla
                    </button>
                    <button type="submit" className="flex-1 btn-primary">
                      Salva Modifiche
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {/* Material Assignment Modal */}
          {showMaterialModal && selectedParty && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-card p-6 rounded-xl border border-border max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-foreground">
                    Materiale per: {selectedParty.nome}
                  </h3>
                  <button
                    onClick={() => setShowMaterialModal(false)}
                    className="p-2 hover:bg-surface rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {loadingMaterials ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Available Materials */}
                    <div>
                      <h4 className="text-lg font-medium text-foreground mb-4">
                        Macro-Categorie Disponibili
                      </h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {macroCategories.map((macro) => (
                          <div
                            key={macro.id}
                            className="flex items-center justify-between p-3 border border-border rounded-lg"
                          >
                            <span className="font-medium">{macro.name}</span>
                            <button
                              onClick={() => handleAssignMaterial(macro.id)}
                              className="btn-primary text-sm px-3 py-1"
                              disabled={partyMaterials.some(
                                (m) => m.id === macro.id
                              )}
                            >
                              {partyMaterials.some((m) => m.id === macro.id)
                                ? "Assegnato"
                                : "Assegna"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Assigned Materials */}
                    <div>
                      <h4 className="text-lg font-medium text-foreground mb-4">
                        Materiale Assegnato
                      </h4>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {partyMaterials.map((macro) => (
                          <div
                            key={macro.id}
                            className="border border-border rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-semibold text-primary">
                                {macro.name}
                              </h5>
                              <button
                                onClick={() => handleRemoveMaterial(macro.id)}
                                className="text-danger hover:bg-red-50 p-1 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {macro.categories?.map((category) => (
                              <div key={category.id} className="ml-4 mb-2">
                                <div className="font-medium text-sm text-foreground">
                                  • {category.name}
                                </div>
                                {category.subcategories?.map((sub) => (
                                  <div
                                    key={sub.id}
                                    className="ml-4 text-sm text-muted-foreground"
                                  >
                                    - {sub.name}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        ))}

                        {partyMaterials.length === 0 && (
                          <p className="text-muted-foreground text-center py-8">
                            Nessun materiale assegnato
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
