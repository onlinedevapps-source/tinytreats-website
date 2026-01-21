# TinyTreats Setup & Deployment Guide

This document describes how to set up the TinyTreats hybrid offline-online e-commerce system.

## 1. Cloud Setup (Supabase)
1. Create a free project on [Supabase.com](https://supabase.com).
2. Go to the SQL Editor and run the following to create the `orders` table:
   ```sql
   create table orders (
     id uuid primary key default uuid_generate_v4(),
     created_at timestamptz default now(),
     customer_name text not null,
     phone text not null,
     items jsonb not null,
     total_price decimal(10,2) not null,
     status text default 'pending'
   );
   ```
3. Get your **Project URL** and **Anon Key** from Project Settings > API.

## 2. Frontend Setup (GitHub Pages)
1. Navigate to the `frontend` folder.
2. Create folder `src` (if not already present).
3. Create a `.env` file in the `frontend` folder using `.env.example`.
4. Run `npm install`.
5. Run `npm run build`.
6. Deploy the `dist` folder to GitHub Pages.

## 3. Local Backend Setup (Local PC)
1. Navigate to the `backend` folder.
2. Create a virtual environment: `python -m venv venv`.
3. Activate it: `.\venv\Scripts\activate`.
4. Install dependencies: `pip install -r requirements.txt`.
5. Create a `.env` file in the root with:
   ```env
   SUPABASE_URL=...
   SUPABASE_KEY=...
   DATABASE_URL=sqlite:///./tinytreats.db
   ```
6. Run the backend: `python main.py`.

## 4. Usage
- **Customer**: Accesses the GitHub Pages URL. Places order -> redirected to WhatsApp -> Order stored in Supabase.
- **Admin**:
  1. Opens local Admin panel (reachable via `npm run dev` in `frontend` or local hosting).
  2. Clicks **Sync Cloud Orders** to pull new orders.
  3. Manages stock and clicks **Confirm & Inv** to generate PDF invoices.
