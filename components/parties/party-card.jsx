"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  MapPin,
  User,
  Users,
  Package,
  Edit,
  Trash2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export function PartyCard({
  party,
  onEdit,
  onDelete,
  onMaterial,
  getStatusColor,
  getStatusText,
  getStatusIcon,
}) {
  const firstShelf = party.shelves ? party.shelves.split(",")[0].trim() : null;

  return (
    <motion.div
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
              <span className="font-medium text-foreground">{party.luogo}</span>
            </div>
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Animatore:</span>
              <span className="font-medium text-foreground">
                {party.animatore?.nome || "Non assegnato"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Magazziniere:</span>
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
                      .map((s) => `#${s.trim()}`)
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
          {firstShelf && (
            <Link href={`/check/${firstShelf}`}>
              <button
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors"
                title="Vai al Check"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </Link>
          )}
          <button
            onClick={() => onMaterial(party)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors"
            title="Gestisci Materiale"
          >
            <Package className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(party)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors"
            title="Modifica Festa"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(party.id)}
            className="p-2 text-muted-foreground hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
