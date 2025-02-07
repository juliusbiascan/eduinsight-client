# EduInsight Client

A computer laboratory monitoring and control software designed for educational institutions. This Electron-based application helps teachers monitor and manage student activities in computer laboratories.

## Features

- Real-time screen monitoring
- File sharing capabilities
- Quiz management and assessment
- Student activity tracking
- Power management controls
- Network access controls
- Student progress analytics

## Tech Stack

- Electron
- React
- TypeScript
- Prisma (MySQL)
- TailwindCSS
- Socket.IO
- PeerJS

## Prerequisites

- Node.js (v16 or higher)
- MySQL Server
- Windows OS (primary support)

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/juliusbiascan/eduinsight-client.git
cd eduinsight-client
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your database configuration:
```env
DATABASE_URL="mysql://user:password@localhost:3306/eduinsight"
```

4. Run the development server:
```bash
npm start
```

## Building

To create a production build:

```bash
npm run make
```

The packaged application will be available in the `out` directory.

## License

MIT

## Author

Julius Biascan (juliusbiascan.bscs.pass@gmail.com)
