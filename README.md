# Angular QuickSight Demo

A modern Angular application for embedding and configuring Amazon QuickSight dashboards using the official QuickSight Embedding SDK.

## Features

- 🚀 **Modern Angular 20** with standalone components
- 🎨 **Beautiful UI** with Tailwind CSS styling
- 🔧 **Dynamic QuickSight Dashboard Configuration** with real-time URL updates
- 📱 **Responsive design** that works on all devices
- 🔒 **Official QuickSight Embedding SDK** for secure dashboard embedding
- 📊 **Professional Dashboard Management** with loading states and error handling

## Prerequisites

- Node.js 18+ 
- npm 9+ or yarn
- Angular CLI 20+
- Amazon QuickSight account with dashboard access

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd angular-qs-demo
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:4200`

## QuickSight Setup

### 1. Get Your Dashboard Embed URL

1. **In QuickSight Console**: Go to Dashboards → Select your dashboard → Share → Embed dashboard
2. **Copy the URL**: The URL will look like:
   ```
   https://us-east-1.quicksight.aws.amazon.com/sn/embed?account=YOUR_ACCOUNT&dashboard=YOUR_DASHBOARD_ID&authcode=YOUR_AUTHCODE
   ```

### 2. Configure Your Dashboard

1. **Update Environment**: Edit `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     quicksight: {
       defaultUrl: 'YOUR_ACTUAL_QUICKSIGHT_DASHBOARD_URL',
       defaultTitle: 'Your Dashboard Name',
       defaultWidth: '100%',
       defaultHeight: '600px'
     }
   };
   ```

2. **Runtime Configuration**: Use the app interface to:
   - Enter new dashboard URLs
   - Update dashboard configurations
   - Reset to default settings

## Usage

1. **Configure Dashboard**: Enter a QuickSight dashboard embed URL in the input field
2. **Update**: Click "Update Dashboard" to change the embedded content
3. **Reset**: Use "Reset to Default" to return to default configuration
4. **Monitor**: Watch for loading states and error messages

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run build:prod` - Build with production optimizations
- `npm run test` - Run unit tests
- `npm run lint` - Run linting

## Project Structure

```
src/
├── app/
│   ├── app.ts          # Main application component with QuickSight SDK
│   ├── app.html        # Main template with dashboard container
│   └── safe.pipe.ts    # Security pipe for URLs
├── environments/        # Environment configuration
└── styles.css          # Global styles
```

## Technologies Used

- **Angular 20** - Modern web framework
- **TypeScript** - Type-safe JavaScript
- **Amazon QuickSight Embedding SDK** - Official SDK for dashboard embedding
- **Tailwind CSS** - Utility-first CSS framework
- **RxJS** - Reactive programming library

## QuickSight Embedding SDK Features

This application leverages the [Amazon QuickSight Embedding SDK](https://www.npmjs.com/package/amazon-quicksight-embedding-sdk) to provide:

- **Secure Dashboard Embedding** - Official AWS SDK for secure embedding
- **Real-time Updates** - Dynamic dashboard switching without page reloads
- **Error Handling** - Comprehensive error management and user feedback
- **Loading States** - Professional loading indicators during dashboard operations
- **Responsive Design** - Automatic sizing and responsive behavior

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
