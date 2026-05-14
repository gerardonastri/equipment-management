"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  Phone,
  Copy,
  Check,
  X,
  RefreshCw,
  Users,
  Warehouse,
  Star,
  Calendar,
  ChevronDown,
  TriangleAlert,
  Truck,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { supabase } from "@/lib/supabase/client";

// ─── Config ruoli ─────────────────────────────────────────────────────────────
const ROLES = [
  {
    value: "amministratore",
    label: "Amministratore",
    icon: Shield,
    color: "text-red-600",
    bg: "bg-red-100",
    border: "border-red-200",
    avatarBg: "bg-red-500",
    tabActive: "bg-red-500 text-white border-red-500",
  },
  {
    value: "magazziniere",
    label: "Magazziniere",
    icon: Warehouse,
    color: "text-orange-600",
    bg: "bg-orange-100",
    border: "border-orange-200",
    avatarBg: "bg-orange-500",
    tabActive: "bg-orange-500 text-white border-orange-500",
  },
  {
    value: "animatore",
    label: "Animatore",
    icon: Star,
    color: "text-green-600",
    bg: "bg-green-100",
    border: "border-green-200",
    avatarBg: "bg-green-500",
    tabActive: "bg-green-500 text-white border-green-500",
  },
  {
    value: "responsabile",
    label: "Responsabile",
    icon: Users,
    color: "text-purple-600",
    bg: "bg-purple-100",
    border: "border-purple-200",
    avatarBg: "bg-purple-500",
    tabActive: "bg-purple-500 text-white border-purple-500",
  },
  {
    value: "driver",
    label: "Driver",
    icon: Truck,
    color: "text-sky-600",
    bg: "bg-sky-100",
    border: "border-sky-200",
    avatarBg: "bg-sky-500",
    tabActive: "bg-sky-500 text-white border-sky-500",
  },
];

const getRoleCfg = (role) => ROLES.find((r) => r.value === role) || ROLES[2];

// ─── Avatar ───────────────────────────────────────────────────────────────────
function UserAvatar({ name, role, size = "md" }) {
  const cfg = getRoleCfg(role);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const sz = size === "lg" ? "w-12 h-12 text-base" : "w-9 h-9 text-sm";
  return (
    <div className={`${sz} ${cfg.avatarBg} rounded-xl flex items-center justify-center shrink-0 font-bold text-white`}>
      {initials}
    </div>
  );
}

// ─── Copia codice ─────────────────────────────────────────────────────────────
function CopyCode({ code }) {
  const [copied, setCopied] = useState(false);
  const handle = async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold transition-all ${
        copied
          ? "bg-green-100 text-green-700 border-green-200"
          : "bg-surface border-border text-foreground hover:border-primary/40 hover:bg-primary/5"
      }`}
      title="Copia codice"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copiato!" : code}
    </button>
  );
}

// ─── User Card ────────────────────────────────────────────────────────────────
function UserCard({ user, onEdit, onDelete, index }) {
  const cfg = getRoleCfg(user.role);
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all p-5"
    >
      <div className="flex items-start gap-3">
        <UserAvatar name={user.name} role={user.role} size="lg" />

        <div className="flex-1 min-w-0">
          {/* Nome + ruolo badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-foreground text-base leading-tight truncate">
              {user.name}
            </h3>
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
              <Icon className="w-3 h-3" />
              {cfg.label}
            </span>
          </div>

          {/* Info riga */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {user.phone || "—"}
            </span>
            {user.partiesCount > 0 && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {user.partiesCount} fest{user.partiesCount === 1 ? "a" : "e"}
              </span>
            )}
            {user.lastCheckDate && (
              <span className="flex items-center gap-1 text-green-600">
                <Check className="w-3 h-3" />
                Ultimo check: {new Date(user.lastCheckDate).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
              </span>
            )}
          </div>

          {user.notes && (
            <p className="text-xs text-muted-foreground mt-2 italic truncate">{user.notes}</p>
          )}
        </div>

        {/* Azioni */}
        <div className="flex items-center gap-1 shrink-0">
          <CopyCode code={user.securityCode} />
          <button
            onClick={() => onEdit(user)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors"
            title="Modifica"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(user)}
            className="p-2 text-muted-foreground hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
            title="Elimina"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Modal Aggiungi/Modifica ──────────────────────────────────────────────────
function UserModal({ isEdit, user, onSubmit, onClose, loading }) {
  const [form, setForm] = useState(
    user || { name: "", phone: "", role: "animatore", securityCode: "", notes: "" }
  );

  useEffect(() => {
    setForm(user || { name: "", phone: "", role: "animatore", securityCode: "", notes: "" });
  }, [user]);

  const generateCode = () => {
    setForm((p) => ({ ...p, securityCode: Math.floor(1000 + Math.random() * 9000).toString() }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.securityCode) {
      alert("Compila nome, telefono e codice di sicurezza.");
      return;
    }
    onSubmit(form);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl border border-border max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header modal */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {form.name && <UserAvatar name={form.name || "?"} role={form.role} />}
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {isEdit ? "Modifica Utente" : "Nuovo Utente"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isEdit ? "Aggiorna le informazioni" : "Aggiungi un membro al team"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Nome Completo</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Es. Mario Rossi"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Telefono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="3XX XXXXXXX"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Ruolo</label>
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Codice di Sicurezza</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.securityCode}
                onChange={(e) => setForm((p) => ({ ...p, securityCode: e.target.value }))}
                className="flex-1 px-3 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring font-mono text-lg tracking-widest"
                placeholder="0000"
                maxLength="4"
                required
              />
              <button
                type="button"
                onClick={generateCode}
                className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-medium text-foreground hover:bg-card transition-colors whitespace-nowrap"
              >
                Genera
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Codice usato per accedere alla pagina check dagli scaffali.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Note</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full px-3 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows="2"
              placeholder="Note opzionali..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-border rounded-xl text-foreground hover:bg-surface transition-colors font-medium"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary rounded-xl py-2.5 font-semibold disabled:opacity-50"
            >
              {loading ? "Salvataggio..." : isEdit ? "Salva Modifiche" : "Crea Utente"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Modal Elimina ────────────────────────────────────────────────────────────
function DeleteModal({ user, onConfirm, onClose, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl border border-border max-w-sm w-full p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <TriangleAlert className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Elimina utente</h3>
            <p className="text-xs text-muted-foreground">Azione irreversibile</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Vuoi davvero eliminare <span className="font-semibold text-foreground">{user.name}</span>?
          Tutti i dati associati verranno rimossi.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-border rounded-xl text-foreground hover:bg-surface transition-colors font-medium">
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? "Eliminando..." : "Elimina"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── PAGINA PRINCIPALE ────────────────────────────────────────────────────────
export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // "all" | "amministratore" | "magazziniere" | "animatore" | "responsabile" | "driver"

  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Carica utenti + stats: n. feste e ultimo check
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("nome", { ascending: true });

      if (error) { console.error("Error fetching users:", error); return; }

      // Per ogni utente carica: n. feste distinte da checks + data ultimo check
      const enriched = await Promise.all((data || []).map(async (u) => {
        const { data: checks } = await supabase
          .from("checks")
          .select("party_id, created_at")
          .eq("user_id", u.id)
          .order("created_at", { ascending: false });

        const partyIds = new Set((checks || []).map((c) => c.party_id));
        const lastCheck = checks?.[0]?.created_at || null;

        return {
          id: u.id,
          name: u.nome ?? "",
          phone: u.telefono ?? "",
          role: u.ruolo ?? "animatore",
          securityCode: u.codice_sicurezza ?? "",
          notes: u.note ?? "",
          partiesCount: partyIds.size,
          lastCheckDate: lastCheck,
        };
      }));

      setUsers(enriched);
    } catch (err) {
      console.error("Exception fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // ── Filtro ──
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone.includes(searchTerm);
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  // Raggruppati per ruolo per la visualizzazione a sezioni
  const grouped = useMemo(() => {
    if (roleFilter !== "all") return { [roleFilter]: filteredUsers };
    return ROLES.reduce((acc, r) => {
      acc[r.value] = filteredUsers.filter((u) => u.role === r.value);
      return acc;
    }, {});
  }, [filteredUsers, roleFilter]);

  // Stats
  const countByRole = useMemo(() => {
    return ROLES.reduce((acc, r) => {
      acc[r.value] = users.filter((u) => u.role === r.value).length;
      return acc;
    }, {});
  }, [users]);

  // ── CRUD ──
  const handleSave = async (form) => {
    setActionLoading(true);
    try {
      if (editUser) {
        const { error } = await supabase.from("users").update({
          nome: form.name,
          telefono: form.phone,
          ruolo: form.role,
          codice_sicurezza: form.securityCode,
          note: form.notes,
        }).eq("id", editUser.id);
        if (error) { alert("Errore durante la modifica."); return; }
      } else {
        const { error } = await supabase.from("users").insert([{
          nome: form.name,
          telefono: form.phone,
          ruolo: form.role,
          codice_sicurezza: form.securityCode,
          note: form.notes,
        }]);
        if (error) { alert("Errore durante la creazione."); return; }
      }
      await fetchUsers();
      setShowModal(false);
      setEditUser(null);
    } catch (err) {
      alert("Errore inatteso.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from("users").delete().eq("id", deleteUser.id);
      if (error) { alert("Errore durante la cancellazione."); return; }
      await fetchUsers();
      setDeleteUser(null);
    } catch (err) {
      alert("Errore inatteso.");
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (user) => { setEditUser(user); setShowModal(true); };
  const openNew = () => { setEditUser(null); setShowModal(true); };

  const TAB_FILTERS = [
    { id: "all", label: "Tutti", count: users.length },
    ...ROLES.map((r) => ({ id: r.value, label: r.label, count: countByRole[r.value] || 0, cfg: r })),
  ];

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <main className="containerMod py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gestione Utenti</h1>
              <p className="text-muted-foreground mt-0.5">
                {loading ? "Caricamento..." : `${users.length} utent${users.length === 1 ? "e" : "i"} nel sistema`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="p-2.5 rounded-xl border border-border bg-card hover:bg-surface text-muted-foreground transition-colors disabled:opacity-40"
                title="Aggiorna"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button onClick={openNew} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nuovo Utente
              </button>
            </div>
          </div>

          {/* ── Stats card mini ── */}
          {!loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Totale", value: users.length, icon: Users, cls: "text-primary bg-primary/10" },
                ...ROLES.map((r) => ({ label: r.label, value: countByRole[r.value] || 0, icon: r.icon, cls: `${r.color} ${r.bg}` })),
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.cls}`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-foreground leading-none">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Ricerca + Tab filtri ── */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cerca per nome o telefono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {TAB_FILTERS.map((tab) => {
                const isActive = roleFilter === tab.id;
                const activeCls = tab.cfg ? tab.cfg.tabActive : "bg-primary text-white border-primary";
                return (
                  <button
                    key={tab.id}
                    onClick={() => setRoleFilter(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      isActive ? activeCls : "border-border text-muted-foreground hover:bg-surface"
                    }`}
                  >
                    {tab.label}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? "bg-white/20" : "bg-surface"}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Lista utenti raggruppati per ruolo ── */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-surface shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-surface rounded-lg w-1/3" />
                      <div className="h-3 bg-surface rounded-lg w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="font-medium text-muted-foreground">Nessun utente trovato</p>
            </div>
          ) : (
            <div className="space-y-8">
              {ROLES.filter((r) => roleFilter === "all" || roleFilter === r.value).map((role) => {
                const roleUsers = grouped[role.value] || [];
                if (!roleUsers.length) return null;
                const RoleIcon = role.icon;
                return (
                  <motion.div key={role.value} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {/* Sezione header */}
                    <div className={`flex items-center gap-2 mb-3 pb-2 border-b border-border`}>
                      <div className={`w-7 h-7 rounded-lg ${role.bg} flex items-center justify-center`}>
                        <RoleIcon className={`w-3.5 h-3.5 ${role.color}`} />
                      </div>
                      <h2 className="font-bold text-foreground">{role.label}</h2>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${role.bg} ${role.color} ${role.border} border`}>
                        {roleUsers.length}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {roleUsers.map((user, i) => (
                        <UserCard
                          key={user.id}
                          user={user}
                          index={i}
                          onEdit={openEdit}
                          onDelete={setDeleteUser}
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

        </motion.div>
      </main>

      {/* ── Modali ── */}
      <AnimatePresence>
        {showModal && (
          <UserModal
            isEdit={!!editUser}
            user={editUser}
            onSubmit={handleSave}
            onClose={() => { setShowModal(false); setEditUser(null); }}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteUser && (
          <DeleteModal
            user={deleteUser}
            onConfirm={handleDelete}
            onClose={() => setDeleteUser(null)}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}