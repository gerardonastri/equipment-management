"use client";

import AdminProvider from "@/components/admin-provider";

export default function AdminLayout({ children }) {
  return <AdminProvider>{children}</AdminProvider>;
}
