# Event & Inventory Management Admin Panel

## Overview

This project is a **production-oriented admin panel** built with **Next.js** to manage events, inventory and staff operations for parties and events.

It models real-world workflows such as:

- planning events
- assigning materials
- authenticating staff members
- performing on-site material checks
- tracking missing or damaged items
- notifying administrators about critical issues

The application is designed as an **internal operational tool**, not a demo project.

---

## Core Workflow

1. Admins create and manage events
2. Inventory is assigned to each event
3. Staff members authenticate and access only their authorized events
4. During or after the event, staff:
   - perform material checks
   - mark missing or damaged items
5. The system:
   - updates inventory status
   - stores check results and attachments
   - sends notifications for critical issues

---

## Key Features

### 📅 Event Management

- Create, edit and manage events
- Event lifecycle handling
- Material assignment per event

### 📦 Inventory Management

- Centralized inventory with quantities
- Material assignment and availability checks
- Status tracking: available, assigned, missing, damaged
- Automatic inventory updates after event completion

### ✅ Staff Material Checks

- Staff authentication via Supabase Auth
- Event-based access control
- Checklist-driven material verification
- Persistent tracking of issues per event

### 🔐 Authentication & Permissions

- Supabase authentication
- Role-based access control (admin / staff)
- Route and UI protection
- Context-based auth state management

### 🔔 Notifications

- Telegram bot integration
- Web push notifications
- Alerts for missing or damaged materials

### 🗂 File Storage

- Supabase Storage integration
- Upload and manage event-specific files
- Used for photos, documents and damage reports

### 📊 Analytics (Supporting Feature)

- Inventory loss trends
- Most frequently missing items
- Event quality metrics  
  _(Analytics supports decision-making but is not the core feature.)_

---

## Tech Stack

### Frontend

- **Next.js 15 (App Router)**
- **React 19**
- **Tailwind CSS**
- **Radix UI**
- **Framer Motion**
- **Lucide Icons**

### Data & State

- **Supabase**
  - Authentication
  - Database
  - Storage
- **SWR** for data fetching and revalidation
- Context API for auth and permissions

### Notifications & Integrations

- Telegram Bot API
- Web Push notifications

---

## Architecture Highlights

- Server-side data fetching with permission checks
- Clear separation between:
  - UI components
  - business logic
  - data access
- Permission-aware routing and components
- Inventory operations modeled with real-world constraints
- Defensive validation on critical workflows

---

## Permissions Model

| Role  | Capabilities                                           |
| ----- | ------------------------------------------------------ |
| Admin | Manage events, inventory, analytics and receive alerts |
| Staff | Access assigned events and perform material checks     |

Permissions are enforced both server-side and client-side.

---

Built by Gerardo Nastri
