# Worship and Yapps - React Native App

A community website for Calgary Bible studies and fellowship events, built with React and TypeScript.

## 🚀 Features

- **Discussion Cards**: Swipeable full-screen cards with Bible study questions
- **Event Discovery**: Find and RSVP to local Bible studies and activities  
- **Community Network**: Connect with other members and build relationships
- **Volunteer Opportunities**: Sign up to host events or serve in various roles
- **Mobile Responsive**: Works perfectly on desktop, tablet, and mobile devices

## 🌐 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/YOUR_USERNAME/worship-and-yapps.git
cd worship-and-yapps
npm install
```

2. **Configure Environment (Optional):**
   - Update `src/lib/supabase.ts` with your Supabase URL and anon key
   - Set up your database using the provided migration files

3. **Run the development server:**
```bash
npm run dev
```

4. **Build for production:**
```bash
npm run build
```

## 🚀 Deployment

### **Netlify (Recommended)**
1. Connect your GitHub repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Deploy automatically on every push

### **Other Platforms**
- **Vercel**: Import from GitHub, auto-detects Vite
- **GitHub Pages**: Use `gh-pages` package
- **Traditional Hosting**: Upload `dist` folder contents

## 🏗️ Project Structure

```
src/
├── components/         # React components
│   ├── topics/        # Discussion cards
│   ├── locations/     # Event discovery
│   ├── network/       # Community networking
│   └── signup/        # Volunteer signup
├── hooks/             # Custom React hooks
├── lib/               # Utilities and configurations
├── types/             # TypeScript definitions
└── App.tsx            # Main app component
```

## 🎨 Key Features

### Discussion Cards
- Interactive cards with Bible study questions
- Navigation between different topics
- Like, comment, and share functionality
- Responsive design for all devices

### Event Management
- Filter events by type (House, Special Event, Activity)
- RSVP functionality with capacity management
- Location information and distance
- Host and volunteer role management

### Community Features
- User connections and networking
- Member profiles with interests and roles
- Search and filter functionality
- Connect and messaging features

## 📦 Dependencies

- **React**: Frontend framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Supabase**: Backend and authentication
- **Lucide React**: Icon library
- **React Hot Toast**: Notifications

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🚀 **Quick Setup Commands**

### **Netlify CLI Method:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Add custom domain
netlify sites:create --name worshipandyaps
netlify deploy --prod
netlify domains:add worshipandyaps.com
```

## 🗄️ **Supabase Setup**

### **1. Create Supabase Project**
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and enter project details:
   - **Name**: `worship-and-yapps`
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to Calgary (US West or Canada Central)
4. Wait for project to be created (2-3 minutes)

### **2. Get Your Supabase Credentials**
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **Anon/Public Key** (starts with `eyJhbGciOiJIUzI1NiI...`)

### **3. Set Environment Variables**
Create a `.env` file in your project root:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **4. Run Database Migrations**
The database schema is already set up in the `supabase/migrations/` folder. Supabase will automatically run these when you connect.

### **5. Enable Authentication**
1. In Supabase dashboard, go to **Authentication** → **Settings**
2. **Site URL**: Set to your domain (e.g., `https://worshipandyaps.com`)
3. **Redirect URLs**: Add your domain
4. **Email Templates**: Customize welcome emails (optional)

### **6. Test Connection**
1. Start your development server: `npm run dev`
2. Try signing up with a test account
3. Check Supabase dashboard → **Authentication** → **Users** to see new users

### **Manual Method:**
1. Build your app: `npm run build`
2. Upload `dist` folder to your hosting provider
3. Configure custom domain in hosting dashboard
4. Update DNS records at your domain registrar

## 🌐 Live Website

Visit the live website at: [worshipandyaps.com](https://worshipandyaps.com)

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For support and questions about the Calgary Bible Study community, please contact the development team.