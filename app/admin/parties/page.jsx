"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { Plus, Search, Package, Clock, Truck, Home } from "lucide-react";
import Navbar from "@/components/navbar";
import { PartyCard } from "@/components/parties/party-card";
import { PartyFormModal } from "@/components/parties/party-form-modal";
import { MaterialModal } from "@/components/parties/material-modal";
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
  const [selectedStatuses, setSelectedStatuses] = useState([]);
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
        return "Scaricato da Scaffale";
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
      case "caricato_scaffale":
        return <Package className="w-4 h-4" />;
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

  const filteredParties = parties.filter((party) => {
    const matchesSearch =
      party.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      party.luogo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (party.animatore?.nome || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (party.magazziniere?.nome || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      selectedStatuses.length === 0 || selectedStatuses.includes(party.stato);

    return matchesSearch && matchesStatus;
  });

  const toggleStatusFilter = (status) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

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

          {/* Search and Filters */}
          <div className="bg-card p-6 rounded-xl border border-border space-y-4">
            {/* Search Bar */}
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

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground pt-2">
                Filtra per stato:
              </span>
              {[
                { value: "iniziale", label: "Iniziale" },
                { value: "caricato_furgone", label: "Caricato nel Furgone" },
                { value: "scaricato_furgone", label: "Scaricato dal Furgone" },
                { value: "scaricato_scaffale", label: "Ritornato al deposito" },
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => toggleStatusFilter(status.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedStatuses.includes(status.value)
                      ? "bg-primary text-white"
                      : "bg-surface text-muted-foreground border border-border hover:bg-surface/80"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Parties List */}
          <div className="grid gap-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Caricamento feste...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center text-danger">
                Errore nel caricamento dei dati
              </div>
            ) : (
              filteredParties.map((party) => (
                <PartyCard
                  key={party.id}
                  party={party}
                  onEdit={handleEditParty}
                  onDelete={handleDeleteParty}
                  onMaterial={openMaterialModal}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                  getStatusIcon={getStatusIcon}
                />
              ))
            )}
          </div>

          {/* Add/Edit Party Modal */}
          <PartyFormModal
            isOpen={showAddForm}
            isEdit={false}
            party={newParty}
            onPartyChange={setNewParty}
            users={users}
            macroCategories={macroCategories}
            selectedMaterials={selectedMaterials}
            onMaterialToggle={toggleMaterialSelection}
            onAddShelf={(shelf) =>
              setNewParty((prev) => ({
                ...prev,
                shelves: [...prev.shelves, shelf].sort((a, b) => a - b),
              }))
            }
            onRemoveShelf={(shelf) =>
              setNewParty((prev) => ({
                ...prev,
                shelves: prev.shelves.filter((s) => s !== shelf),
              }))
            }
            onSubmit={handleAddParty}
            onCancel={() => {
              setShowAddForm(false);
              setSelectedMaterials([]);
            }}
            allParties={parties}
          />

          <PartyFormModal
            isOpen={showEditForm}
            isEdit={true}
            party={editParty}
            onPartyChange={setEditParty}
            users={users}
            macroCategories={macroCategories}
            selectedMaterials={selectedMaterials}
            onMaterialToggle={toggleMaterialSelection}
            onAddShelf={(shelf) =>
              editParty &&
              setEditParty((prev) => ({
                ...prev,
                shelves: [...prev.shelves, shelf].sort((a, b) => a - b),
              }))
            }
            onRemoveShelf={(shelf) =>
              editParty &&
              setEditParty((prev) => ({
                ...prev,
                shelves: prev.shelves.filter((s) => s !== shelf),
              }))
            }
            onSubmit={handleUpdateParty}
            onCancel={() => {
              setShowEditForm(false);
              setEditParty(null);
            }}
            allParties={parties}
          />

          {/* Material Modal */}
          <MaterialModal
            isOpen={showMaterialModal}
            party={selectedParty}
            materials={partyMaterials}
            loading={loadingMaterials}
            macroCategories={macroCategories}
            onAssignMaterial={handleAssignMaterial}
            onRemoveMaterial={handleRemoveMaterial}
            onClose={() => setShowMaterialModal(false)}
          />
        </motion.div>
      </main>
    </div>
  );
}
