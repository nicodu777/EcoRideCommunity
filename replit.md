# EcoRide - Carpooling Application

## Overview

EcoRide is a modern eco-responsible carpooling web application built with a full-stack JavaScript architecture. The application connects drivers and passengers for environmentally-friendly ride-sharing with an intelligent booking system and comprehensive administrative interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## Project Structure (Architecture POO — ECF Studi)

Le projet est divisé en deux dossiers indépendants partageant les `node_modules` racine :

```
/
├── frontend/          Interface React (Vite, port 5000)
│   ├── src/           Composants, pages, hooks, lib
│   ├── vite.config.ts Proxy /api → localhost:5001
│   └── index.html
├── backend/           API Express (port 5001)
│   ├── server/        Routes, Services, Repositories
│   │   ├── routes/    userRoutes.ts (POO)
│   │   ├── services/  UserService.ts (logique métier)
│   │   └── repositories/ UserRepository.ts (accès DB)
│   └── shared/        schema.ts (types partagés)
├── node_modules/      Partagés entre frontend et backend
└── package.json       Scripts racine (npm run dev)
```

### Workflows Replit
- **Start application** : `cd frontend && vite --port 5000` (webview)
- **Start backend** : `cd backend && tsx server/index.ts` (console, port 5001)

### Frontend Architecture
- **Framework**: React avec TypeScript
- **Build Tool**: Vite (port 5000, proxy /api → backend:5001)
- **UI Library**: Shadcn/UI + Radix UI
- **Styling**: Tailwind CSS (thème écologique vert)
- **State Management**: TanStack Query v5
- **Authentication**: Firebase Authentication
- **Routing**: Wouter

### Backend Architecture (POO — 3 couches)
- **Runtime**: Node.js + Express.js (port 5001)
- **Language**: TypeScript
- **Database ORM**: Drizzle ORM + PostgreSQL
- **Couche Routes**: `backend/server/routes/` — reçoit et valide les requêtes
- **Couche Services**: `backend/server/services/` — logique métier
- **Couche Repository**: `backend/server/repositories/` — accès base de données
- **WebSocket**: Chat en temps réel (`backend/server/websocket.ts`)
- **Authentication**: Firebase (utilisateurs) + bcrypt (employés)

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **Schema**: Comprehensive relational schema with tables for:
  - Users (with credits system, roles, ratings)
  - Trips (with mandatory vehicle information)
  - Bookings (with reservation management)
  - Ratings (with approval system)
  - Chat messages (real-time communication)
  - Employee management and admin actions

## Key Components

### Authentication & Authorization
- **User Authentication**: Firebase Auth with email/password
- **Role-Based Access**: Three distinct user types:
  - Regular users (passenger/driver)
  - Employees (moderation permissions)
  - Administrators (full system access)
- **Employee Authentication**: Separate authentication system with bcrypt password hashing

### Trip Management
- **Vehicle Requirements**: Mandatory vehicle type, brand, and model selection
- **Ecological Classification**: Automatic eco-friendly marking for electric vehicles
- **Seat Management**: Real-time availability tracking
- **Status Tracking**: Trip lifecycle management (pending → started → completed)

### Credit System
- **Initial Credits**: 20 credits awarded upon registration
- **Transaction Management**: Automatic credit deduction/award system
- **Validation**: Pre-booking credit verification

### Real-Time Features
- **WebSocket Integration**: Live chat system for trip participants
- **Instant Updates**: Real-time seat availability and booking status
- **Notifications**: System-wide notification center

### Security Features
- **Form Validation**: Client and server-side validation with Zod
- **Double Confirmation**: Booking confirmation modal system
- **Data Protection**: Sensitive information masking
- **Manual Review**: Employee approval system for ratings and disputes

## Data Flow

1. **User Registration**: Firebase Auth → Backend user creation → 20 credits allocation
2. **Trip Publication**: Form validation → Vehicle verification → Database storage → Real-time updates
3. **Booking Process**: Credit verification → Confirmation modal → Payment processing → Seat allocation
4. **Chat System**: WebSocket connection → Real-time message broadcasting → Database persistence
5. **Rating System**: Trip completion → Rating submission → Employee review → Public display

## External Dependencies

### Core Services
- **Firebase**: Authentication and user management
- **Neon Database**: PostgreSQL hosting and serverless scaling
- **Stripe**: Payment processing infrastructure (configured but simplified for demo)
- **SendGrid**: Email notification system

### Development Tools
- **Drizzle Kit**: Database migrations and schema management
- **ESBuild**: Production build optimization
- **TypeScript**: Type checking and compilation
- **Tailwind CSS**: Utility-first styling framework

## Deployment Strategy

### Development Environment
- **Replit Integration**: Optimized for Replit development environment
- **Hot Reload**: Vite HMR for instant development feedback
- **Environment Variables**: Separate configuration for development/production

### Production Build
- **Frontend**: Vite build with optimized assets
- **Backend**: ESBuild compilation for Node.js deployment
- **Database**: Drizzle migrations for schema deployment
- **Static Assets**: Served through Express static middleware

### Configuration Requirements
- **Firebase Config**: API keys and project configuration
- **Database URL**: Neon PostgreSQL connection string
- **Environment Variables**: Secure configuration management

The application emphasizes ecological responsibility through vehicle type requirements, uses modern web technologies for optimal performance, and implements comprehensive security measures throughout the user journey.