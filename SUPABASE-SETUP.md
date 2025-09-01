# 🗄️ Supabase Setup Guide for Worship and Yapps

## 📋 **Step-by-Step Setup**

### **1. Create Supabase Project**

1. **Go to** [supabase.com](https://supabase.com)
2. **Click** "New Project"
3. **Choose** your organization
4. **Enter project details:**
   - **Name**: `worship-and-yapps`
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to Calgary (Canada Central or US West)
5. **Click** "Create new project"
6. **Wait** 2-3 minutes for project creation

### **2. Get Your Credentials**

1. **In Supabase dashboard**, go to **Settings** → **API**
2. **Copy these values:**
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### **3. Set Environment Variables**

**Create a `.env` file in your project root:**

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Replace with your actual values from step 2!**

### **4. Database Schema Setup**

The database schema is already created in `supabase/migrations/`. Supabase will automatically run these migrations.

**Your database will include:**
- ✅ Users table (profiles, roles, approval status)
- ✅ Events table (Bible studies, activities)
- ✅ Locations table (venues for events)
- ✅ Topics table (discussion questions)
- ✅ Comments table (threaded discussions)
- ✅ Connections table (community networking)
- ✅ Notifications table (alerts and updates)
- ✅ All security policies (Row Level Security)

### **5. Configure Authentication**

1. **In Supabase dashboard**, go to **Authentication** → **Settings**
2. **Site URL**: Set to your domain
   - Development: `http://localhost:5173`
   - Production: `https://worshipandyaps.com`
3. **Redirect URLs**: Add both URLs above
4. **Email confirmations**: Disabled (for easier signup)
5. **Allow new signups**: Enabled

### **6. Test Your Connection**

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Try signing up** with a test account

3. **Check Supabase dashboard:**
   - Go to **Authentication** → **Users**
   - You should see your new test user

4. **Test features:**
   - Create a discussion topic
   - RSVP to an event
   - Connect with other users

### **7. Production Deployment**

**For Netlify deployment:**

1. **In Netlify dashboard**, go to **Site settings** → **Environment variables**
2. **Add your Supabase credentials:**
   ```
   VITE_SUPABASE_URL = https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiI...
   ```

3. **Update Supabase auth settings:**
   - **Site URL**: `https://worshipandyaps.com`
   - **Redirect URLs**: Add your live domain

## 🔧 **Troubleshooting**

### **Common Issues:**

**❌ "Missing VITE_SUPABASE_URL" error:**
- Make sure `.env` file is in project root
- Check that variable names match exactly
- Restart development server after adding `.env`

**❌ Authentication not working:**
- Check Site URL in Supabase auth settings
- Verify redirect URLs include your domain
- Make sure email confirmations are disabled for testing

**❌ Database errors:**
- Check that migrations ran successfully
- Verify RLS policies are enabled
- Test with Supabase SQL editor

### **Verify Setup:**

**✅ Environment variables loaded:**
```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
```

**✅ Database connection:**
- Try signing up a test user
- Check users appear in Supabase dashboard

**✅ Real-time features:**
- Test notifications
- Try messaging between users

## 🎉 **You're Ready!**

Once setup is complete, your Calgary Bible Study website will have:

- ✅ **Real user authentication**
- ✅ **Persistent data storage**
- ✅ **Real-time notifications**
- ✅ **Community features**
- ✅ **Event management**
- ✅ **Discussion platform**

**Your website is now production-ready for Wednesday launch! 🚀**