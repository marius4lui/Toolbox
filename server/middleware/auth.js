const { createClient } = require('@supabase/supabase-js')

// Configuration (should be passed or imported, but for now duplicating constants to be safe, or we can export them from a config file)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://supabase.qhrd.online'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1ODAyOTg4MCwiZXhwIjo0OTEzNzAzNDgwLCJyb2xlIjoiYW5vbiJ9.NM4IQDxdwgeSpIxB-AMVm34i70g7XJKtKxf2imns9fc'

// Auth middleware - extracts user from token if present
async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        try {
            // Create authenticated client
            const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            })
            const { data: { user }, error } = await client.auth.getUser()
            if (!error && user) {
                req.user = user
                req.supabase = client
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
        // Create authenticated client for RLS
        req.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        })

        const { data: { user }, error } = await req.supabase.auth.getUser()
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' })
        }
        req.user = user
        next()
    } catch (e) {
        return res.status(401).json({ error: 'Authentication failed' })
    }
}

module.exports = {
    optionalAuth,
    requireAuth,
    SUPABASE_URL,
    SUPABASE_ANON_KEY
}
