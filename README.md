# Modern Aluminium Fabrication Pandalam

A professional business website for Aluminium Fabrication Pandalam with an integrated contact form system and admin dashboard.

## Features

- **Responsive Business Website** - Modern and mobile-friendly design showcasing services and company information
- **Contact Form** - Secure contact form for customer inquiries with backend message storage
- **Admin Dashboard** - Password-protected admin panel to view and manage all customer messages
- **Session Authentication** - Secure session management for admin access
- **CORS Support** - Configurable cross-origin resource sharing for API endpoints
- **SEO Optimized** - Includes sitemap.xml and robots.txt for search engine visibility
- **Google Analytics** - Integrated analytics tracking

## Tech Stack

- **Frontend**: HTML5, CSS, JavaScript
- **Backend**: Node.js with built-in HTTP server
- **Storage**: JSON-based file storage
- **Hosting**: Configurable for various platforms

## Installation

### Prerequisites

- Node.js (v12 or higher)
- npm (comes with Node.js)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/business-website.git
cd business-website
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (optional):
```bash
# Create a .env file in the root directory
PORT=3000
ADMIN_PASSWORD=your_secure_password
ADMIN_SESSION_TOKEN=your_session_token
FRONTEND_ORIGIN=https://www.aluminiumfabricationpandalam.in
API_HOSTNAME=api.aluminiumfabricationpandalam.in
```

## Running the Server

### Development

```bash
npm start
```

The server will run on `http://localhost:3000` by default.

### Production

Set environment variables and run:
```bash
PORT=3000 npm start
```

## Project Structure

```
.
├── index.html              # Main website page
├── admin.html              # Admin dashboard for managing messages
├── server.js               # Node.js backend server
├── config.js               # Configuration file
├── package.json            # Project dependencies
├── robots.txt              # Search engine crawler directives
├── sitemap.xml             # XML sitemap for SEO
├── ads.txt                 # Ads.txt file for ad verification
├── data/
│   └── messages.json       # Stored contact form messages
└── README.md               # This file
```

## API Endpoints

### Contact Form
- **POST** `/api/contact` - Submit a contact form message
  - Body: `{ name, email, phone, message }`
  - Returns: `{ success: true, id: message_id }`

### Admin
- **GET** `/api/messages` - Get all stored messages (requires authentication)
- **POST** `/api/login` - Admin login with password
- **POST** `/api/logout` - Admin logout

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `ADMIN_PASSWORD` | midhun123 | Admin panel password |
| `ADMIN_SESSION_TOKEN` | admin-session-midhun | Session token for authentication |
| `FRONTEND_ORIGIN` | (empty) | Allowed origin URLs (comma-separated) |
| `API_HOSTNAME` | (empty) | API hostname for validation |

## Usage

1. **Visit the Website**: Navigate to the main website at the configured domain or `http://localhost:3000`
2. **Submit Contact Form**: Fill out and submit the contact form
3. **Access Admin Panel**: Go to `/admin.html` and log in with the admin password
4. **View Messages**: All submitted messages are displayed in the admin dashboard

## Deployment

This website can be deployed to various platforms:
- **Traditional Hosting** - Upload files to any Node.js-compatible hosting
- **Cloud Platforms** - Deploy to Heroku, AWS, Azure, DigitalOcean, Vercel, etc.
- **Docker** - Containerize using Docker for consistent deployment

### Example: Deploy to Heroku

```bash
heroku create your-app-name
git push heroku main
heroku config:set ADMIN_PASSWORD=your_secure_password
```

## Security Considerations

- Change the default `ADMIN_PASSWORD` in production
- Use HTTPS in production (enforced in config.js)
- Set `FRONTEND_ORIGIN` to restrict API access
- Regularly backup the `data/messages.json` file
- Keep Node.js and dependencies updated

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

This project is proprietary and confidential. All rights reserved.

## Contact

For inquiries about this website or services:

- **Website**: https://www.aluminiumfabricationpandalam.in
- **Email**: [midhunmanesh01@gmail.com]
- **Phone**: [8590392681]

---

**Last Updated**: May 2026
