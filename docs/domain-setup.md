# Domain Setup Guide for worshipandyaps.com

## 🌐 After Purchasing Your Domain

### **1. DNS Configuration**
Once you own `worshipandyaps.com`, you'll need to point it to your deployed app.

#### **For Netlify Deployment:**
1. Go to your Netlify dashboard
2. Click on your site
3. Go to "Domain settings"
4. Click "Add custom domain"
5. Enter `worshipandyaps.com`
6. Follow the DNS configuration instructions

#### **DNS Records to Add:**
```
Type: A
Name: @
Value: [Netlify IP address - they'll provide this]

Type: CNAME  
Name: www
Value: [your-site].netlify.app
```

### **2. SSL Certificate**
Most hosting providers (Netlify, Vercel, etc.) automatically provide free SSL certificates for custom domains.

### **3. Update App Configuration**
After domain is connected, update any hardcoded URLs in your app.

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

### **Manual Method:**
1. Build your app: `npm run build`
2. Upload `dist` folder to your hosting provider
3. Configure custom domain in hosting dashboard
4. Update DNS records at your domain registrar

## 📧 **Email Setup (Optional)**
You can also set up professional email addresses:
- `hello@worshipandyaps.com`
- `support@worshipandyaps.com`
- `admin@worshipandyaps.com`

Popular email hosting options:
- **Google Workspace** ($6/month per user)
- **Microsoft 365** ($5/month per user)
- **Zoho Mail** (Free tier available)

## 🔧 **Troubleshooting**
- **DNS propagation** can take 24-48 hours
- **Use DNS checker tools** to verify configuration
- **Clear browser cache** if site doesn't load immediately

## 📞 **Need Help?**
After you purchase the domain, I can help you with:
- DNS configuration
- SSL setup
- Email configuration
- App deployment optimization