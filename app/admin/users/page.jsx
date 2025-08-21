"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import Navbar from "@/components/navbar";

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    role: "worker",
    securityCode: "",
    notes: "",
  });

  // Mock users data
  const users = [
    {
      id: 1,
      name: "Marco Rossi",
      email: "marco.rossi@email.com",
      phone: "+39 333 1234567",
      role: "admin",
      securityCode: "1234",
      lastLogin: "2024-01-10 14:30",
      status: "active",
      notes: "Responsabile principale",
    },
    {
      id: 2,
      name: "Luca Bianchi",
      email: "luca.bianchi@email.com",
      phone: "+39 333 2345678",
      role: "manager",
      securityCode: "5678",
      lastLogin: "2024-01-10 12:15",
      status: "active",
      notes: "Responsabile audio/video",
    },
    {
      id: 3,
      name: "Sara Verdi",
      email: "sara.verdi@email.com",
      phone: "+39 333 3456789",
      role: "worker",
      securityCode: "9012",
      lastLogin: "2024-01-09 16:45",
      status: "active",
      notes: "Specialista decorazioni",
    },
    {
      id: 4,
      name: "Anna Neri",
      email: "anna.neri@email.com",
      phone: "+39 333 4567890",
      role: "worker",
      securityCode: "3456",
      lastLogin: "2024-01-08 09:20",
      status: "inactive",
      notes: "In ferie fino al 20/01",
    },
  ];

  const roles = [
    { value: "admin", label: "Amministratore", color: "text-danger" },
    { value: "manager", label: "Manager", color: "text-secondary" },
    { value: "worker", label: "Operatore", color: "text-primary" },
  ];

  const getRoleColor = (role) => {
    const roleObj = roles.find((r) => r.value === role);
    return roleObj ? roleObj.color : "text-muted-foreground";
  };

  const getRoleLabel = (role) => {
    const roleObj = roles.find((r) => r.value === role);
    return roleObj ? roleObj.label : role;
  };

  const getStatusColor = (status) => {
    return status === "active" ? "status-active" : "status-pending";
  };

  const getStatusText = (status) => {
    return status === "active" ? "Attivo" : "Inattivo";
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    // Mock add user - in real app this would call API
    console.log("Adding user:", newUser);
    setShowAddForm(false);
    setNewUser({
      name: "",
      email: "",
      phone: "",
      role: "worker",
      securityCode: "",
      notes: "",
    });
  };

  const generateSecurityCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setNewUser((prev) => ({ ...prev, securityCode: code }));
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm)
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
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo Utente</span>
            </button>
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
                      <span className={getStatusColor(user.status)}>
                        {getStatusText(user.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium text-foreground">
                          {user.email}
                        </span>
                      </div>
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
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Ultimo accesso:
                        </span>
                        <span className="font-medium text-foreground">
                          {user.lastLogin}
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

          {/* Add User Modal */}
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
                  Crea Nuovo Utente
                </h3>

                <form onSubmit={handleAddUser} className="space-y-4">
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

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) =>
                          setNewUser((prev) => ({
                            ...prev,
                            email: e.target.value,
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
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-surface transition-colors"
                    >
                      Annulla
                    </button>
                    <button type="submit" className="flex-1 btn-primary">
                      Crea Utente
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
