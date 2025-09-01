#!/bin/bash

echo "🚀 Setting up Worship and Yapps React Native App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if React Native CLI is installed
if ! command -v react-native &> /dev/null; then
    echo "📱 Installing React Native CLI..."
    npm install -g react-native-cli
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# iOS Setup
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Setting up iOS..."
    cd ios
    
    # Check if CocoaPods is installed
    if ! command -v pod &> /dev/null; then
        echo "📱 Installing CocoaPods..."
        sudo gem install cocoapods
    fi
    
    # Install iOS dependencies
    pod install
    cd ..
    
    echo "✅ iOS setup complete!"
else
    echo "⚠️  iOS setup skipped (macOS required)"
fi

# Android Setup
echo "🤖 Setting up Android..."

# Check if Android SDK is available
if [ -z "$ANDROID_HOME" ]; then
    echo "⚠️  ANDROID_HOME not set. Please install Android Studio and set ANDROID_HOME."
else
    echo "✅ Android SDK found at $ANDROID_HOME"
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual API keys"
fi

# Set executable permissions for gradlew
chmod +x android/gradlew

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env file with your API keys"
echo "2. For iOS: Open ios/WorshipAndYapps.xcworkspace in Xcode"
echo "3. For Android: Open android folder in Android Studio"
echo "4. Run 'npm run ios' or 'npm run android' to start"
echo ""
echo "📱 Development commands:"
echo "  npm run ios      - Run on iOS simulator"
echo "  npm run android  - Run on Android emulator"
echo "  npm start        - Start Metro bundler"
echo "  npm test         - Run tests"
echo ""