# Worship and Yapps - Calgary Bible Study Community

A modern web application for Calgary Bible studies and fellowship events, built with React, TypeScript, and Supabase.

## 🚀 Features

- **Discussion Cards**: Swipeable full-screen cards with Bible study questions
- **Event Discovery**: Find and RSVP to local Bible studies and activities  
- **Community Network**: Connect with other members and build relationships
- **Volunteer Opportunities**: Sign up to host events or serve in various roles
- **Mobile Responsive**: Works perfectly on desktop, tablet, and mobile devices

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 📦 Installation

1. **Clone the repository:**
```bash
git clone https://github.com/YOUR_USERNAME/worship-and-yapps.git
cd worship-and-yapps
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
```
Update `.env` with your Supabase credentials.

4. **Run the development server:**
```bash
npm run dev
```

5. **Build for production:**
```bash
npm run build
```

6. **Alternatively, use the setup/start scripts (Windows PowerShell):**
```powershell
# One-time setup: installs dependencies and ensures .env is present
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1

# Start the dev server (opens http://localhost:5173)
powershell -ExecutionPolicy Bypass -File scripts\start.ps1
```

## 🌐 Environment Variables

Create a `.env` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🗄️ Database Setup

The project uses Supabase for the backend. Database migrations are included in the `supabase/migrations/` folder.

## 📱 Features Overview

### Discussion Topics
- Interactive cards with Bible study questions
- Full-screen view with swipe navigation
- Like, comment, and share functionality
- Search and filter by category

### Event Management
- Create and host events (Bible studies, activities)
- RSVP system with capacity management
- Volunteer role coordination
- Food coordination system
- Real-time messaging between attendees

### Community Networking
- User profiles and connections
- Connection requests and messaging
- Search and filter community members
- Interest-based matching

### Volunteer System
- Sign up for various serving roles
- Event hosting capabilities
- Skill and availability tracking
- Opportunity notifications

## 🏗️ Project Structure

```
src/
├── components/         # React components
│   ├── auth/          # Authentication components
│   ├── events/        # Event management
│   ├── locations/     # Event discovery
│   ├── network/       # Community networking
│   ├── signup/        # Volunteer signup
│   └── topics/        # Discussion cards
├── hooks/             # Custom React hooks
├── lib/               # Utilities and configurations
├── types/             # TypeScript definitions
├── data/              # Sample data
└── App.tsx            # Main app component
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions about the Calgary Bible Study community, please create an issue in this repository.

## 🎉 Live Website

Visit: [worshipandyaps.com](https://worshipandyaps.com)

---

Built with ❤️ for the Calgary Bible Study community
