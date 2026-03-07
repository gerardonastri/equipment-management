"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Package,
  Clock,
  Truck,
  Home,
  Warehouse,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { PartyCard } from "@/components/parties/party-card";
import { PartyFormModal } from "@/components/parties/party-form-modal";
import { MaterialModal } from "@/components/parties/material-modal";
import { PartyHistoryModal } from "@/components/parties/party-history-modal";
import {
  getPartiesData,
  getPartyMaterials,
  createParty,
  deleteParty,
  assignMaterial,
  removeMaterial,
  updateParty,
  getPartyHistory,
} from "./actions";
import { cacheManager } from "@/lib/cache/db";

const fetcher = () => getPartiesData();

export default function PartiesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [showFormModal, setShowFormModal] = useState(false);
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

  // --- STORICO ---
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyParty, setHistoryParty] = useState(null);

  // Mappa partyId → { lossCount, hasMissingMaterial } per gli alert
  const [partyAlerts, setPartyAlerts] = useState({});

  const { data, error, isLoading, mutate } = useSWR("parties-data", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  useEffect(() => {
    if (data?.parties) {
      cacheManager.cacheParties(data.parties).catch(console.error);
      cacheManager.cacheUsers(data.users || []).catch(console.error);
      cacheManager.cacheMacros(data.macroCategories || []).catch(console.error);
      loadPartyAlerts(data.parties);
    }
  }, [data]);

  useEffect(() => {
    const loadOfflineData = async () => {
      if (!navigator.onLine && (error || !data)) {
        const [parties, users, macroCategories] = await Promise.all([
          cacheManager.getPartiesFromCache(),
          cacheManager.getUsersFromCache(),
          cacheManager.getMacrosFromCache(),
        ]);

        if (parties?.length > 0) {
          mutate(
            {
              parties,
              users: users || [],
              macroCategories: macroCategories || [],
            },
            false
          );
        }
      }
    };
    loadOfflineData().catch(console.error);
  }, [error, navigator.onLine]);

  const parties = data?.parties || [];
  const users = data?.users || [];
  const macroCategories = data?.macroCategories || [];

  /**
   * Carica in background i conteggi di perdite per ogni festa
   * per mostrare i badge di alert sulle card.
   */
  const loadPartyAlerts = async (partiesList) => {
    const results = await Promise.allSettled(
      partiesList.map(async (party) => {
        const history = await getPartyHistory(party.id);
        return {
          id: party.id,
          lossCount: history.losses?.length || 0,
          hasMissingMaterial: history.losses?.some((l) => l.tipo === "mancante"),
          losses: history.losses || [],
        };
      })
    );

    const alertMap = {};
    results.forEach((res, idx) => {
      if (res.status === "fulfilled") {
        alertMap[partiesList[idx].id] = res.value;
      }
    });
    setPartyAlerts(alertMap);
  };

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
        return "bg-red-100 text-red-800 border-red-200";
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
        return "Caricato sullo scaffale";
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
        return <Warehouse className="w-4 h-4" />;
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
      await createParty({ ...newParty, selectedMaterials });
      mutate();
      setShowFormModal(false);
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
    setShowFormModal(true);
  };

  const handleUpdateParty = async (e) => {
    e.preventDefault();
    try {
      await updateParty(editParty.id, editParty);
      mutate();
      setShowFormModal(false);
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
      mutate();
    } catch (error) {
      console.error("Error assigning material:", error);
      alert("Errore nell'assegnazione del materiale");
    }
  };

  const handleRemoveMaterial = async (macroId) => {
    try {
      await removeMaterial(selectedParty.id, macroId);
      await loadPartyMaterialsData(selectedParty.id);
      mutate();
    } catch (error) {
      console.error("Error removing material:", error);
      alert("Errore nella rimozione del materiale");
    }
  };

  const handleDeleteParty = async (partyId) => {
    if (!confirm("Sei sicuro di voler eliminare questa festa?")) return;
    try {
      await deleteParty(partyId);
      await cacheManager.deletePartyFromCache(partyId);
      mutate();
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

  const openHistoryModal = (party) => {
    setHistoryParty(party);
    setShowHistoryModal(true);
  };

  const toggleMaterialSelection = (materialId) => {
    setSelectedMaterials((prev) =>
      prev.includes(materialId)
        ? prev.filter((id) => id !== materialId)
        : [...prev, materialId]
    );
  };

  const filteredParties = parties.filter((party) => {
    const matchesSearch =
      party.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      party.luogo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (party.animatore?.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (party.magazziniere?.nome || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      selectedStatuses.length === 0 || selectedStatuses.includes(party.stato);

    return matchesSearch && matchesStatus;
  });

  const toggleStatusFilter = (status) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const isOfflineWithData = error && !isLoading && parties.length > 0;

  if (isLoading && !parties.length) {
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

  if (error && !isOfflineWithData) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <main className="containerMod py-8">
          <div className="text-center text-danger">
            {navigator.onLine
              ? "Errore nel caricamento dei dati"
              : "Offline - nessun dato in cache"}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <main className="containerMod py-8">
        {isOfflineWithData && (
          <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800">
            📡 Modalità offline - visualizzando dati salvati. I dati verranno
            sincronizzati quando torna la connessione.
          </div>
        )}

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
              onClick={() => {
                setEditParty(null);
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
                setShowFormModal(true);
              }}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nuova Festa</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="bg-card p-6 rounded-xl border border-border space-y-4">
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
            {filteredParties.length > 0 ? (
              filteredParties.map((party) => {
                const alerts = partyAlerts[party.id];
                const enrichedParty = {
                  ...party,
                  _lossCount: alerts?.lossCount || 0,
                  _hasMissingMaterial: alerts?.hasMissingMaterial || false,
                  _losses: alerts?.losses || [],
                };

                return (
                  <PartyCard
                    key={party.id}
                    party={enrichedParty}
                    onEdit={handleEditParty}
                    onDelete={handleDeleteParty}
                    onMaterial={openMaterialModal}
                    onHistory={openHistoryModal}
                    getStatusColor={getStatusColor}
                    getStatusText={getStatusText}
                    getStatusIcon={getStatusIcon}
                  />
                );
              })
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nessuna festa trovata</p>
              </div>
            )}
          </div>

          <PartyFormModal
            isOpen={showFormModal}
            isEdit={editParty !== null}
            party={editParty || newParty}
            onPartyChange={(updatedParty) => {
              if (editParty) {
                setEditParty(updatedParty);
              } else {
                setNewParty(updatedParty);
              }
            }}
            users={users}
            macroCategories={macroCategories}
            selectedMaterials={selectedMaterials}
            onMaterialToggle={toggleMaterialSelection}
            onAddShelf={(shelf) => {
              if (editParty) {
                setEditParty((prev) => ({
                  ...prev,
                  shelves: [...prev.shelves, shelf].sort((a, b) => a - b),
                }));
              } else {
                setNewParty((prev) => ({
                  ...prev,
                  shelves: [...prev.shelves, shelf].sort((a, b) => a - b),
                }));
              }
            }}
            onRemoveShelf={(shelf) => {
              if (editParty) {
                setEditParty((prev) => ({
                  ...prev,
                  shelves: prev.shelves.filter((s) => s !== shelf),
                }));
              } else {
                setNewParty((prev) => ({
                  ...prev,
                  shelves: prev.shelves.filter((s) => s !== shelf),
                }));
              }
            }}
            onSubmit={editParty ? handleUpdateParty : handleAddParty}
            onCancel={() => {
              setShowFormModal(false);
              setEditParty(null);
              setSelectedMaterials([]);
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

          {/* History Modal */}
          <PartyHistoryModal
            isOpen={showHistoryModal}
            party={historyParty}
            onClose={() => {
              setShowHistoryModal(false);
              setHistoryParty(null);
            }}
          />
        </motion.div>
      </main>
    </div>
  );
}