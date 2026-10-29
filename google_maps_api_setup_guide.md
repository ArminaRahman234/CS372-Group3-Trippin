# Google Maps API Setup & Configuration Guide

This document outlines the step-by-step process for generating, securing, and configuring a Google Cloud API Key for the **Trippin Travel Planner** application. Following these steps ensures all map features—including Places Search, Autocomplete, Map Markers, Polylines, and Dynamic Bounds—function properly without throwing API authorization errors (`ApiTargetBlockedMapError` or `LegacyApiNotActivatedMapError`).

---

## 1. Project Creation & Billing

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click on the project dropdown in the top navigation bar and select **New Project**.
3. Name your project (e.g., `TrippinTravelPlanner - WebAPP`) and click **Create**.
4. Open the **Billing** section from the left navigation panel and attach an active billing account to the project.
   > **Note:** Google Cloud provides a $200 recurring monthly credit for Maps Platform products, which covers typical development and testing usage.

---

## 2. Enable Required APIs

For full application functionality, you must enable **three specific APIs** within the Google Cloud API Library.

1. Navigate to **APIs & Services > Library**.
2. Search for and **Enable** each of the following APIs:
   - **Maps JavaScript API** *(Handles core map rendering, markers, and polylines)*
   - **Places API** *(Legacy API required for standard Places search and Autocomplete support)*
   - **Places API (New)** *(Required for modern place place details and updated autocomplete features)*

---

## 3. API Key Generation & Restrictions

### Generating the Key
1. Go to **APIs & Services > Credentials**.
2. Click **+ Create Credentials** at the top and select **API Key**.
3. Copy the newly generated key.

### Configuring Key Restrictions
1. Find your newly created key under **API Keys** and click the edit icon (or the key name, e.g., `TrippinMap`).
2. Under **Application restrictions**:
   - For **Development**: Set to **None** to allow local testing (`localhost`).
   - For **Production**: Set to **Websites** and add your deployment domain(s).
3. Under **API restrictions**:
   - Choose **Restrict key**.
   - Select the following **3 APIs** from the dropdown menu:
     - `Maps JavaScript API`
     - `Places API`
     - `Places API (New)`
4. Scroll to the bottom and click **Save**.

> ⚠️ **Propagation Delay Notice:** Changes to Google Cloud API key restrictions can take **up to 5 minutes** to propagate globally across Google's edge servers.

---

## 4. Environment Setup (`.env`)

Add your generated API key to your local environment file in the frontend application directory (`client/.env`).

1. In the `client/` directory, create or edit the `.env` file:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```
2. Verify `.env` is listed in `.gitignore` to prevent committing sensitive keys to version control.
3. Keep `client/.env.example` updated with a placeholder for team members:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=
   ```

---

## 5. Troubleshooting Common Errors

| Error Message / Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `ApiTargetBlockedMapError` | The key is restricted and does not allow one of the required APIs (or changes haven't propagated yet). | Ensure all 3 APIs (`Maps JavaScript API`, `Places API`, `Places API (New)`) are checked in API Restrictions, save, wait 3–5 minutes, restart the Vite dev server, and hard refresh (`Ctrl + Shift + R`). |
| `LegacyApiNotActivatedMapError` | The legacy `Places API` is disabled in Google Cloud Console. | Go to the API Library, search for **Places API**, and click **Enable**. |
| `React.Children.only expected to receive a single React element child` | JSX comment placed inside `<Autocomplete>` wrapper tags. | Move any JSX comments (`{/* ... */}`) outside of the `<Autocomplete>` component so that `<input />` remains the sole child element. |
