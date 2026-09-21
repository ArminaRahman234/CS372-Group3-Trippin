# 🌎 Trippin — Travel Planner

**CS 37200: Web App Development**

Trippin is a modern travel planning web application designed to make organizing trips easier. Instead of keeping itineraries, locations, budgets, booking information, and travel notes across multiple apps, Trippin brings everything together into one simple dashboard.

Users can create trips, organize itinerary items, explore locations on an interactive map, track expenses, save multiple trips, and share their travel plans with others.

---

## ✨ Features

### 🧳 Trip Management

* Create a trip with a title, starting location, destination, and travel dates
* Save multiple trips
* Edit and delete trip information
* Bookmark trips for easier access

### 📅 Itinerary Management

* Add, edit, and delete itinerary items
* Organize flights, hotels, rental cars, activities, parks, shopping locations, and other stops
* Keep scheduled and flexible activities together

### 🗺️ Interactive Map

* Interactive Google Maps integration
* Search for points of interest
* Bookmark locations
* Display itinerary stops on the map
* View routes between locations
* Estimate travel times between stops

### 💰 Budget & Expense Tracking

* Set a total trip budget
* Manually log expenses
* Organize expenses into categories such as:

  * Lodging
  * Transportation
  * Meals
  * Activities
  * Shopping
* Monitor spending throughout the trip

### 🔗 Trip Sharing

* Generate a shareable link for a trip
* Allow friends and travel companions to view an itinerary without editing it

### 🧾 Stretch Goal

* Upload receipt images or booking confirmation documents
* Attach uploaded files to expenses

---

## 🛠️ Technology Stack

### Front-End

* React 18+
* Tailwind CSS
* `@react-google-maps/api`
* JavaScript
* HTML/CSS

### Back-End

* Node.js
* Express.js
* REST API

### Database

* PostgreSQL
* Prisma ORM

### Testing

* Jest
* Supertest

### Deployment

* Vercel — Front-End
* Render or Railway — Back-End and PostgreSQL

### Version Control

* Git
* GitHub
* Feature branches
* Pull requests

---

## 📂 Planned Project Structure

```text
trippin/
│
├── client/                 # React front-end
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
│
├── server/                 # Node/Express back-end
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── server.js
│
├── prisma/
│   └── schema.prisma
│
├── tests/
│
├── .gitignore
├── README.md
└── package.json
```

*The project structure may change as development progresses.*

---

## ⚙️ Local Setup

The exact setup instructions will be updated as development progresses.

```bash
# Clone the repository
git clone <repository-url>

# Enter the project directory
cd CS372-Group3-Trippin

# Install dependencies
npm install

# Start the development environment
npm run dev
```

Environment variables such as database credentials and Google Maps API keys should be stored in a `.env` file and should **not** be committed to GitHub.

---

## 🔒 Environment Variables

Example:

```env
DATABASE_URL=your_postgresql_database_url
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
PORT=3000
```

A `.env.example` file can be included in the repository to show which environment variables are required without exposing private API keys.

---

## 🧪 Testing

The project will use **Jest** and **Supertest** for testing.

Planned testing includes:

* API endpoint testing
* Trip creation and retrieval
* Itinerary CRUD operations
* Budget and expense operations
* Error handling
* Database interactions

```bash
npm test
```

---

## 🎯 Project Goal

The goal of Trippin is to create a practical full-stack web application while demonstrating concepts learned in **CS 37200 Web App Development**, including React development, REST APIs, database integration, testing, version control, deployment, and team-based software development.

By the end of the project, Trippin will provide users with one organized place to plan, manage, track, and share their trips.

---

**Trippin — Plan less. Travel more. ✈️**
