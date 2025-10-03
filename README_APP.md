# Curator 🎵 - Music Curation Mini-App

A Base/Farcaster mini-app where music curators can share recommendations and get rewarded with tokens.

## Features Implemented

✅ **Home Feed** - Browse all music recommendations without authentication
✅ **Post Recommendations** - Share music with reviews, genre, and mood tags (requires wallet)
✅ **Tipping System** - Tip curators with simulated tokens
✅ **User Profiles** - View curator stats and their recommendations
✅ **Wallet Authentication** - Progressive auth with OnchainKit
✅ **Token Economics** - Every user starts with 500 tokens
✅ **Mobile-First Design** - Responsive UI optimized for smartphones

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Mini-App SDK**: @coinbase/onchainkit
- **Styling**: Tailwind CSS
- **State Management**: React Context
- **Authentication**: Wallet authentication via OnchainKit

## Getting Started

1. **Install Dependencies**
```bash
npm install
```

2. **Run Development Server**
```bash
npm run dev
```

3. **Open in Browser**
```
http://localhost:3001
```

## How to Use

### As a Listener (No Wallet Required)
1. Open the app - you'll see the home feed immediately
2. Browse music recommendations
3. Click on music links to listen on external platforms
4. Click "Tip ⭐" button to tip a curator (will prompt to connect wallet)

### As a Curator (Requires Wallet)
1. Click "Connect Wallet" button in the top right
2. Click "Share Music" button
3. Fill out the form:
   - Music URL (YouTube Music, Spotify, Apple Music, SoundCloud)
   - Review/Context (max 280 characters)
   - Genre selection
   - Mood tags (max 2)
4. Submit to post your recommendation
5. Earn tokens when others tip your recommendations

### Viewing Your Profile
1. Connect your wallet
2. Click your wallet address or the balance indicator
3. View your stats:
   - Token balance
   - Total tips received
   - Number of recommendations
   - List of your recommendations

## Token Economics (Simulated)

- Every user starts with **500 free tokens**
- Tip curators with quick amounts (10, 25, 50, 100) or custom amounts
- Curators earn tokens from tips
- Your balance is shown in the top navigation when connected
- All token logic is simulated in-memory (no blockchain transactions yet)

## Project Structure

```
app/
├── components/           # React components
│   ├── HomeFeed.tsx     # Main feed view
│   ├── NavBar.tsx       # Navigation bar
│   ├── RecommendationCard.tsx  # Individual recommendation display
│   ├── PostRecommendationModal.tsx  # Share music form
│   ├── TipModal.tsx     # Tipping interface
│   └── UserProfileModal.tsx  # User profile view
├── context/
│   └── AppContext.tsx   # Global state management
├── types/
│   └── index.ts         # TypeScript interfaces
├── utils/
│   └── seedData.ts      # Sample data
├── page.tsx             # Main page
└── providers.tsx        # OnchainKit + App providers
```

## Configuration

The app is configured with:
- **Base Chain**: Base network
- **API Key**: Set in `.env` file
- **Dark Mode**: Automatic based on system preferences

## Important Notes

- **Data Storage**: All data is stored in-memory and resets on page refresh (by design for MVP)
- **No localStorage**: Doesn't work in Base mini-app iframes
- **Authentication**: Progressive - only required for posting and tipping
- **Mobile Optimized**: Touch targets are 44px minimum height

## Next Steps for Production

1. Integrate real smart contracts for token minting/tipping
2. Add persistent data storage (database)
3. Implement follow system
4. Add genre/mood filtering
5. Build curator leaderboard
6. Add "Share to Farcaster" functionality
7. Integrate with web3 music platforms

## Testing in Base App

1. Deploy to Vercel/Netlify
2. Configure mini-app manifest
3. Test in Base App mini-app environment
4. Verify wallet connection works in iframe

## Support

For issues or questions, please check:
- OnchainKit docs: https://onchainkit.xyz
- Base docs: https://docs.base.org

---

Built with [OnchainKit](https://onchainkit.xyz) 🚀
