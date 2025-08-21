"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Bell, Shield, Database, Globe } from "lucide-react";
import Navbar from "@/components/navbar";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    checkCompletedNotifications: true,
    delayedCheckNotifications: true,
    newPartyNotifications: true,

    // Security Settings
    sessionTimeout: "8",
    requireStrongPasswords: true,
    twoFactorAuth: false,
    loginAttempts: "3",

    // System Settings
    defaultCheckTimeout: "24",
    autoAssignShelves: false,
    backupFrequency: "daily",
    dataRetention: "365",

    // Company Settings
    companyName: "Material Manager",
    companyEmail: "admin@materialmanager.com",
    companyPhone: "+39 333 1234567",
    companyAddress: "Via Roma 123, Milano",
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log("Settings saved:", settings);
    setIsSaving(false);
  };

  const SettingSection = ({ title, icon: Icon, children }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card p-6 rounded-xl border border-border"
    >
      <div className="flex items-center space-x-2 mb-6">
        <Icon className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </motion.div>
  );

  const ToggleSetting = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-medium text-foreground">{label}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );

  const InputSetting = ({
    label,
    value,
    onChange,
    type = "text",
    options = null,
  }) => (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        {label}
      </label>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}
    </div>
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
                Impostazioni Sistema
              </h1>
              <p className="text-muted-foreground">
                Configura le impostazioni del sistema
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`btn-primary flex items-center space-x-2 ${
                isSaving ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? "Salvataggio..." : "Salva Impostazioni"}</span>
            </button>
          </div>

          {/* Notification Settings */}
          <SettingSection title="Notifiche" icon={Bell}>
            <ToggleSetting
              label="Notifiche Email"
              description="Ricevi notifiche via email"
              checked={settings.emailNotifications}
              onChange={(value) =>
                handleSettingChange("emailNotifications", value)
              }
            />
            <ToggleSetting
              label="Notifiche SMS"
              description="Ricevi notifiche via SMS"
              checked={settings.smsNotifications}
              onChange={(value) =>
                handleSettingChange("smsNotifications", value)
              }
            />
            <ToggleSetting
              label="Notifiche Push"
              description="Ricevi notifiche push nel browser"
              checked={settings.pushNotifications}
              onChange={(value) =>
                handleSettingChange("pushNotifications", value)
              }
            />
            <div className="border-t border-border pt-4">
              <h3 className="font-medium text-foreground mb-3">
                Tipi di Notifica
              </h3>
              <div className="space-y-3">
                <ToggleSetting
                  label="Check Completati"
                  checked={settings.checkCompletedNotifications}
                  onChange={(value) =>
                    handleSettingChange("checkCompletedNotifications", value)
                  }
                />
                <ToggleSetting
                  label="Check in Ritardo"
                  checked={settings.delayedCheckNotifications}
                  onChange={(value) =>
                    handleSettingChange("delayedCheckNotifications", value)
                  }
                />
                <ToggleSetting
                  label="Nuove Feste"
                  checked={settings.newPartyNotifications}
                  onChange={(value) =>
                    handleSettingChange("newPartyNotifications", value)
                  }
                />
              </div>
            </div>
          </SettingSection>

          {/* Security Settings */}
          <SettingSection title="Sicurezza" icon={Shield}>
            <InputSetting
              label="Timeout Sessione (ore)"
              value={settings.sessionTimeout}
              onChange={(value) => handleSettingChange("sessionTimeout", value)}
              type="number"
            />
            <ToggleSetting
              label="Password Complesse Obbligatorie"
              description="Richiedi password con almeno 8 caratteri, maiuscole, minuscole e numeri"
              checked={settings.requireStrongPasswords}
              onChange={(value) =>
                handleSettingChange("requireStrongPasswords", value)
              }
            />
            <ToggleSetting
              label="Autenticazione a Due Fattori"
              description="Abilita 2FA per maggiore sicurezza"
              checked={settings.twoFactorAuth}
              onChange={(value) => handleSettingChange("twoFactorAuth", value)}
            />
            <InputSetting
              label="Tentativi di Login Massimi"
              value={settings.loginAttempts}
              onChange={(value) => handleSettingChange("loginAttempts", value)}
              type="number"
            />
          </SettingSection>

          {/* System Settings */}
          <SettingSection title="Sistema" icon={Database}>
            <InputSetting
              label="Timeout Check Predefinito (ore)"
              value={settings.defaultCheckTimeout}
              onChange={(value) =>
                handleSettingChange("defaultCheckTimeout", value)
              }
              type="number"
            />
            <ToggleSetting
              label="Assegnazione Automatica Scaffali"
              description="Assegna automaticamente scaffali liberi alle nuove feste"
              checked={settings.autoAssignShelves}
              onChange={(value) =>
                handleSettingChange("autoAssignShelves", value)
              }
            />
            <InputSetting
              label="Frequenza Backup"
              value={settings.backupFrequency}
              onChange={(value) =>
                handleSettingChange("backupFrequency", value)
              }
              options={[
                { value: "daily", label: "Giornaliero" },
                { value: "weekly", label: "Settimanale" },
                { value: "monthly", label: "Mensile" },
              ]}
            />
            <InputSetting
              label="Conservazione Dati (giorni)"
              value={settings.dataRetention}
              onChange={(value) => handleSettingChange("dataRetention", value)}
              type="number"
            />
          </SettingSection>

          {/* Company Settings */}
          <SettingSection title="Informazioni Azienda" icon={Globe}>
            <InputSetting
              label="Nome Azienda"
              value={settings.companyName}
              onChange={(value) => handleSettingChange("companyName", value)}
            />
            <InputSetting
              label="Email Aziendale"
              value={settings.companyEmail}
              onChange={(value) => handleSettingChange("companyEmail", value)}
              type="email"
            />
            <InputSetting
              label="Telefono Aziendale"
              value={settings.companyPhone}
              onChange={(value) => handleSettingChange("companyPhone", value)}
              type="tel"
            />
            <InputSetting
              label="Indirizzo Aziendale"
              value={settings.companyAddress}
              onChange={(value) => handleSettingChange("companyAddress", value)}
            />
          </SettingSection>
        </motion.div>
      </main>
    </div>
  );
}
