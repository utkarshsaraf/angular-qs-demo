# Angular QuickSight Demo

A modern Angular application for embedding and configuring QuickSight dashboards and other web content.

## Features

- 🚀 **Modern Angular 20** with standalone components
- 🎨 **Beautiful UI** with Tailwind CSS styling
- 🔧 **Dynamic URL configuration** for embedded content
- 📱 **Responsive design** that works on all devices
- 🔒 **Safe content embedding** with security pipe

## Prerequisites

- Node.js 18+ 
- npm 9+ or yarn
- Angular CLI 20+

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

## Usage

1. **Configure Embed**: Enter a URL in the input field (QuickSight dashboard, YouTube video, etc.)
2. **Update**: Click the Update button to change the embedded content
3. **Reset**: Use the Reset button to return to default settings

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
│   ├── app.ts          # Main application component
│   ├── app.html        # Main template
│   └── safe.pipe.ts    # Security pipe for URLs
├── environments/        # Environment configuration
└── styles.css          # Global styles
```

## Technologies Used

- **Angular 20** - Modern web framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **RxJS** - Reactive programming library

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
