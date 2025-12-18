// Toolbox Link & QR Code API Server
require('dotenv').config()
// Hosted at: api.qhrd.online
// Features:
// - POST /api/create → Create new redirect
// - GET /api/links → Get user's links
// - Management endpoints (Update/Delete) for links and account

const express = require('express')
const cors = require('cors')
const authRoutes = require('./routes/auth')
const linkRoutes = require('./routes/links')

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api', linkRoutes) // Mounted at /api because endpoints are like /api/create, /api/links

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Central Toolbox Server',
        version: '2.0.0',
        redirectService: 'https://links.qhrd.online',
        features: [
            'Central Authentication & User Management',
            'Link Shortening & Management',
            'QR Code Generation',
            'Toolbox Data Sync'
        ]
    })
})

app.listen(PORT, () => {
    console.log(`🚀 Toolbox Link & QR Code Server running on port ${PORT}`)
})
