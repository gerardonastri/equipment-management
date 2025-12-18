"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  Phone,
  Calendar,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { supabase } from "@/lib/supabase/client"; // assicurati che il path sia corretto

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  // editMode = true quando stiamo modificando un utente (modal riusato)
  const [editMode, setEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  const [newUser, setNewUser] = useState({
    name: "",
    phone: "",
    role: "animatore",
    securityCode: "",
    notes: "",
  });

  // roles allineati alla tua tabella (italiano)
  const roles = [
    { value: "amministratore", label: "Amministratore", color: "text-danger" },
    { value: "magazziniere", label: "Magazziniere", color: "text-secondary" },
    { value: "animatore", label: "Animatore", color: "text-green-500" },
  ];

  const getRoleColor = (role) => {
    const roleObj = roles.find((r) => r.value === role);
    return roleObj ? roleObj.color : "text-muted-foreground";
  };

  const getRoleLabel = (role) => {
    const roleObj = roles.find((r) => r.value === role);
    return roleObj ? roleObj.label : role;
  };

  // Stato per utenti presi dal DB
  const [dbUsers, setDbUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stato per cancellazione (confirm)
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    userId: null,
    userName: "",
  });

  // Funzione per fetchare utenti dal DB Supabase
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .ilike("nome", `%${searchTerm}%`)
        .order("nome", { ascending: true });

      if (error) {
        console.error("Errore fetching users:", error);
        setDbUsers([]);
        return;
      }
      // mappa i campi DB nella stessa shape usata dall'interfaccia
      const mapped = data.map((item) => ({
        id: item.id,
        name: item.nome ?? "",
        phone: item.telefono ?? "",
        role: item.ruolo ?? "animatore",
        securityCode: item.codice_sicurezza ?? "",
        notes: item.note ?? "",
        // opzionali: lastLogin/status se li hai nella tabella
        lastLogin: item.last_login ?? "",
        status: item.status ?? "active",
      }));
      setDbUsers(mapped);
    } catch (err) {
      console.error("Exception fetching utenti:", err);
      setDbUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Genera codice sicurezza 4 cifre
  const generateSecurityCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setNewUser((prev) => ({ ...prev, securityCode: code }));
  };

  // Aggiungi o modifica utente
  const handleAddOrEditUser = async (e) => {
    e.preventDefault();

    // validazioni minime
    if (!newUser.name || !newUser.phone || !newUser.securityCode) {
      alert("Compila nome, telefono e codice di sicurezza.");
      return;
    }

    try {
      setLoading(true);
      if (editMode && editingUserId) {
        // UPDATE
        const { data, error } = await supabase
          .from("users")
          .update({
            nome: newUser.name,
            telefono: newUser.phone,
            ruolo: newUser.role,
            codice_sicurezza: newUser.securityCode,
            note: newUser.notes,
          })
          .eq("id", editingUserId)
          .select();

        if (error) {
          console.error("Errore updating user:", error);
          alert("Errore durante la modifica dell'utente.");
        } else {
          // aggiorna la lista
          await fetchUsers();
          setShowAddForm(false);
          setEditMode(false);
          setEditingUserId(null);
          setNewUser({
            name: "",
            phone: "",
            role: "amministratore",
            securityCode: "",
            notes: "",
          });
        }
      } else {
        // INSERT
        const { data, error } = await supabase
          .from("users")
          .insert([
            {
              nome: newUser.name,
              telefono: newUser.phone,
              ruolo: newUser.role,
              codice_sicurezza: newUser.securityCode,
              note: newUser.notes,
            },
          ])
          .select();

        if (error) {
          console.error("Errore inserting user:", error);
          alert("Errore durante la creazione dell'utente.");
        } else {
          // aggiorna la lista
          await fetchUsers();
          setShowAddForm(false);
          setNewUser({
            name: "",
            phone: "",
            role: "amministratore",
            securityCode: "",
            notes: "",
          });
        }
      }
    } catch (err) {
      console.error("Exception add/edit user:", err);
      alert("Errore inatteso.");
    } finally {
      setLoading(false);
    }
  };

  // Apri modal modifica
  const handleStartEdit = (user) => {
    setEditMode(true);
    setEditingUserId(user.id);
    setNewUser({
      name: user.name || "",
      phone: user.phone || "",
      role: user.role || "animatore",
      securityCode: user.securityCode || "",
      notes: user.notes || "",
    });
    setShowAddForm(true);
  };

  // Cancella con conferma
  const handleRequestDelete = (user) => {
    setDeleteConfirm({ show: true, userId: user.id, userName: user.name });
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ show: false, userId: null, userName: "" });
  };

  const handleConfirmDelete = async () => {
    const id = deleteConfirm.userId;
    if (!id) return;
    try {
      setLoading(true);
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) {
        console.error("Errore delete user:", error);
        alert("Errore durante la cancellazione.");
      } else {
        await fetchUsers();
        handleCancelDelete();
      }
    } catch (err) {
      console.error("Exception deleting user:", err);
      alert("Errore inatteso durante la cancellazione.");
    } finally {
      setLoading(false);
    }
  };

  const allUsers = dbUsers;

  const filteredUsers = allUsers.filter(
    (user) =>
      (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone || "").includes(searchTerm)
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
                Gestione Utenti
              </h1>
              <p className="text-muted-foreground">
                Gestisci tutti gli utenti del sistema
              </p>
            </div>
            <div className="flex items-center gap-4">
              {loading ? (
                <span className="text-sm text-muted-foreground">
                  Caricamento utenti...
                </span>
              ) : null}
              <button
                onClick={() => {
                  // reset form e set add mode
                  setEditMode(false);
                  setEditingUserId(null);
                  setNewUser({
                    name: "",
                    phone: "",
                    role: "animatore",
                    securityCode: "",
                    notes: "",
                  });
                  setShowAddForm(true);
                }}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nuovo Utente</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cerca utenti..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Users List */}
          <div className="grid gap-6">
            {filteredUsers.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card p-6 rounded-xl border border-border card-hover"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-xl font-semibold text-foreground">
                        {user.name}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(
                          user.role
                        )} bg-surface`}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Telefono:</span>
                        <span className="font-medium text-foreground">
                          {user.phone}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Codice:</span>
                        <span className="font-medium text-foreground font-mono">
                          {user.securityCode}
                        </span>
                      </div>
                    </div>

                    {user.notes && (
                      <p className="text-sm text-muted-foreground mt-3 italic">
                        {user.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleStartEdit(user)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors"
                      title="Modifica"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRequestDelete(user)}
                      className="p-2 text-muted-foreground hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
                      title="Elimina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredUsers.length === 0 && !loading && (
              <div className="p-6 bg-card rounded-xl border border-border text-center text-muted-foreground">
                Nessun utente trovato.
              </div>
            )}
          </div>

          {/* Add / Edit User Modal (riusa lo stesso modal) */}
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
                  {editMode ? "Modifica Utente" : "Crea Nuovo Utente"}
                </h3>

                <form onSubmit={handleAddOrEditUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        value={newUser.name}
                        onChange={(e) =>
                          setNewUser((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Telefono
                      </label>
                      <input
                        type="tel"
                        value={newUser.phone}
                        onChange={(e) =>
                          setNewUser((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Ruolo
                      </label>
                      <select
                        value={newUser.role}
                        onChange={(e) =>
                          setNewUser((prev) => ({
                            ...prev,
                            role: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      >
                        {roles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Codice di Sicurezza
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newUser.securityCode}
                        onChange={(e) =>
                          setNewUser((prev) => ({
                            ...prev,
                            securityCode: e.target.value,
                          }))
                        }
                        className="flex-1 px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                        placeholder="4 cifre"
                        maxLength="4"
                        required
                      />
                      <button
                        type="button"
                        onClick={generateSecurityCode}
                        className="px-4 py-2 bg-surface border border-border rounded-lg text-foreground hover:bg-card transition-colors"
                      >
                        Genera
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Note
                    </label>
                    <textarea
                      value={newUser.notes}
                      onChange={(e) =>
                        setNewUser((prev) => ({
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
                      onClick={() => {
                        setShowAddForm(false);
                        setEditMode(false);
                        setEditingUserId(null);
                        setNewUser({
                          name: "",
                          phone: "",
                          role: "animatore",
                          securityCode: "",
                          notes: "",
                        });
                      }}
                      className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-surface transition-colors"
                    >
                      Annulla
                    </button>
                    <button type="submit" className="flex-1 btn-primary">
                      {editMode ? "Salva Modifiche" : "Crea Utente"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {/* Delete Confirm Modal */}
          {deleteConfirm.show && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-card p-6 rounded-xl border border-border max-w-md w-full"
              >
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Sei sicuro?
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Vuoi davvero eliminare{" "}
                  <strong>{deleteConfirm.userName}</strong>? Questa azione non è
                  reversibile.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCancelDelete}
                    className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-surface transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Elimina
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
