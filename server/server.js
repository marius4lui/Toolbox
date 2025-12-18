// Toolbox Link & QR Code API Server
// Hosted at: api.qhrd.online
// Redirects are handled by: links.qhrd.online (see redirect-server.js)
// Features:
// - POST /api/create → Create new redirect (guest: limited, auth: unlimited)
// - GET /api/links → Get user's links (auth required)
// - PUT /api/links/:hash → Update link (auth required)
// - DELETE /api/links/:hash → Delete link (auth required)
// - POST /api/auth/register → Register user
// - POST /api/auth/login → Login user
// - POST /api/auth/logout → Logout user
// - GET /api/auth/validate → Validate token

const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const rateLimit = require('express-rate-limit')

const app = express()
const PORT = process.env.PORT || 3000

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://supabase.qhrd.online'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1ODAyOTg4MCwiZXhwIjo0OTEzNzAzNDgwLCJyb2xlIjoiYW5vbiJ9.NM4IQDxdwgeSpIxB-AMVm34i70g7XJKtKxf2imns9fc'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Middleware
app.use(cors())
app.use(express.json())

// Rate limiting for unauthenticated requests
const guestLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
    // Uses default IP-based key generator which handles IPv6 properly
})

// Rate limiting for authenticated requests (more lenient)
const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
    // Uses default IP-based key generator
})

// Guest link creation tracker (IP-based, in-memory for simplicity)
const guestLinks = new Map() // IP -> timestamp

// Generate random hash
function generateHash(length = 10) {
    return crypto.randomBytes(length).toString('base64url').slice(0, length)
}

// Auth middleware - extracts user from token if present
async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        try {
            const { data: { user }, error } = await supabase.auth.getUser(token)
            if (!error && user) {
                req.user = user
            }
        } catch (e) {
            // Token invalid, continue as guest
        }
    }
    next()
}

// Required auth middleware
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' })
    }

    const token = authHeader.substring(7)
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' })
        }
        req.user = user
        next()
    } catch (e) {
        return res.status(401).json({ error: 'Authentication failed' })
    }
}

// ================== AUTH ROUTES ==================

// Register
app.post('/api/auth/register', guestLimiter, async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' })
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password
        })

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        res.json({
            success: true,
            user: data.user,
            session: data.session
        })
    } catch (error) {
        console.error('Register error:', error)
        res.status(500).json({ error: 'Registration failed' })
    }
})

// Login
app.post('/api/auth/login', guestLimiter, async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' })
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (error) {
            return res.status(401).json({ error: error.message })
        }

        res.json({
            success: true,
            user: data.user,
            session: data.session
        })
    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({ error: 'Login failed' })
    }
})

// Logout
app.post('/api/auth/logout', requireAuth, async (req, res) => {
    try {
        const authHeader = req.headers.authorization
        const token = authHeader.substring(7)

        // Note: Supabase handles logout client-side, but we can invalidate server-side
        res.json({ success: true, message: 'Logged out successfully' })
    } catch (error) {
        console.error('Logout error:', error)
        res.status(500).json({ error: 'Logout failed' })
    }
})

// Validate token (check if still valid)
app.get('/api/auth/validate', requireAuth, async (req, res) => {
    // If we reach here, the token is valid (requireAuth middleware passed)
    res.json({
        success: true,
        valid: true,
        user: {
            id: req.user.id,
            email: req.user.email
        }
    })
})

// ================== LINK ROUTES ==================

// Create new redirect
app.post('/api/create', optionalAuth, async (req, res) => {
    try {
        const { url } = req.body

        if (!url) {
            return res.status(400).json({ error: 'URL is required' })
        }

        // Validate URL
        try {
            new URL(url)
        } catch {
            return res.status(400).json({ error: 'Invalid URL' })
        }

        const clientIp = req.ip || req.connection.remoteAddress

        // Check if guest (not authenticated)
        if (!req.user) {
            // Apply rate limit
            const lastCreate = guestLinks.get(clientIp)
            const now = Date.now()
            const oneHourAgo = now - (60 * 60 * 1000) // 1 hour cooldown

            if (lastCreate && lastCreate > oneHourAgo) {
                const remainingMs = lastCreate + (60 * 60 * 1000) - now
                const remainingMin = Math.ceil(remainingMs / 60000)
                return res.status(429).json({
                    error: `Guests can only create 1 link per hour. Please login for unlimited links.`,
                    retryAfterMinutes: remainingMin
                })
            }
        }

        // Generate unique hash
        let hash = generateHash()
        let attempts = 0

        // Ensure hash is unique
        while (attempts < 5) {
            const { data: existing } = await supabase
                .from('redirects')
                .select('hash')
                .eq('hash', hash)
                .single()

            if (!existing) break
            hash = generateHash()
            attempts++
        }

        // Calculate expiration (31 days from now)
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 31)

        // Insert into database
        const insertData = {
            hash,
            target_url: url,
            expires_at: expiresAt.toISOString(),
            is_active: true
        }

        // Add user_id if authenticated
        if (req.user) {
            insertData.user_id = req.user.id
        }

        const { data, error } = await supabase
            .from('redirects')
            .insert(insertData)
            .select()
            .single()

        if (error) {
            console.error('Supabase error:', error)
            return res.status(500).json({ error: 'Failed to create redirect' })
        }

        // Track guest link creation
        if (!req.user) {
            guestLinks.set(clientIp, Date.now())
        }

        res.json({
            success: true,
            hash: data.hash,
            shortUrl: `https://links.qhrd.online/${data.hash}`,
            targetUrl: url,
            expiresAt: data.expires_at,
            isGuest: !req.user
        })

    } catch (error) {
        console.error('Error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Get user's links
app.get('/api/links', requireAuth, authLimiter, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('redirects')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Supabase error:', error)
            return res.status(500).json({ error: 'Failed to fetch links' })
        }

        res.json({
            success: true,
            links: data.map(link => ({
                hash: link.hash,
                shortUrl: `https://links.qhrd.online/${link.hash}`,
                targetUrl: link.target_url,
                clicks: link.clicks,
                isActive: link.is_active,
                createdAt: link.created_at,
                expiresAt: link.expires_at
            }))
        })
    } catch (error) {
        console.error('Error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Update link
app.put('/api/links/:hash', requireAuth, authLimiter, async (req, res) => {
    try {
        const { hash } = req.params
        const { url } = req.body

        if (!url) {
            return res.status(400).json({ error: 'URL is required' })
        }

        // Validate URL
        try {
            new URL(url)
        } catch {
            return res.status(400).json({ error: 'Invalid URL' })
        }

        // Check ownership
        const { data: existing, error: findError } = await supabase
            .from('redirects')
            .select('user_id')
            .eq('hash', hash)
            .single()

        if (findError || !existing) {
            return res.status(404).json({ error: 'Link not found' })
        }

        if (existing.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this link' })
        }

        // Update
        const { data, error } = await supabase
            .from('redirects')
            .update({ target_url: url })
            .eq('hash', hash)
            .select()
            .single()

        if (error) {
            console.error('Supabase error:', error)
            return res.status(500).json({ error: 'Failed to update link' })
        }

        res.json({
            success: true,
            hash: data.hash,
            shortUrl: `https://links.qhrd.online/${data.hash}`,
            targetUrl: data.target_url
        })
    } catch (error) {
        console.error('Error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Delete link
app.delete('/api/links/:hash', requireAuth, authLimiter, async (req, res) => {
    try {
        const { hash } = req.params

        // Check ownership
        const { data: existing, error: findError } = await supabase
            .from('redirects')
            .select('user_id')
            .eq('hash', hash)
            .single()

        if (findError || !existing) {
            return res.status(404).json({ error: 'Link not found' })
        }

        if (existing.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this link' })
        }

        // Delete
        const { error } = await supabase
            .from('redirects')
            .delete()
            .eq('hash', hash)

        if (error) {
            console.error('Supabase error:', error)
            return res.status(500).json({ error: 'Failed to delete link' })
        }

        res.json({ success: true, message: 'Link deleted' })
    } catch (error) {
        console.error('Error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Restore expired link (extend by 31 days)
app.post('/api/links/:hash/restore', requireAuth, authLimiter, async (req, res) => {
    try {
        const { hash } = req.params

        // Check ownership
        const { data: existing, error: findError } = await supabase
            .from('redirects')
            .select('user_id')
            .eq('hash', hash)
            .single()

        if (findError || !existing) {
            return res.status(404).json({ error: 'Link not found' })
        }

        if (existing.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to restore this link' })
        }

        // Calculate new expiration (31 days from now)
        const newExpiresAt = new Date()
        newExpiresAt.setDate(newExpiresAt.getDate() + 31)

        // Restore link
        const { data, error } = await supabase
            .from('redirects')
            .update({
                is_active: true,
                expires_at: newExpiresAt.toISOString()
            })
            .eq('hash', hash)
            .select()
            .single()

        if (error) {
            console.error('Supabase error:', error)
            return res.status(500).json({ error: 'Failed to restore link' })
        }

        res.json({
            success: true,
            message: 'Link restored',
            hash: data.hash,
            shortUrl: `https://links.qhrd.online/${data.hash}`,
            expiresAt: data.expires_at
        })
    } catch (error) {
        console.error('Error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Note: Redirect routes have been moved to redirect-server.js (links.qhrd.online)

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Toolbox Link & QR Code API',
        version: '2.0.0',
        redirectService: 'https://links.qhrd.online',
        features: [
            'Link shortening with 31-day expiration',
            'Optional user authentication',
            'Link management (view, edit, delete)',
            'Rate limiting'
        ]
    })
})

app.listen(PORT, () => {
    console.log(`🚀 Toolbox Link & QR Code Server running on port ${PORT}`)
})
