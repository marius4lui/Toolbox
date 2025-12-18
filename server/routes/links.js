const express = require('express')
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { requireAuth, optionalAuth, SUPABASE_URL, SUPABASE_ANON_KEY } = require('../middleware/auth')
const { authLimiter } = require('../middleware/rateLimit')

const router = express.Router()
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Guest link creation tracker (IP-based, in-memory for simplicity)
const guestLinks = new Map() // IP -> timestamp

// Generate random hash
function generateHash(length = 10) {
    return crypto.randomBytes(length).toString('base64url').slice(0, length)
}

// Create new redirect
router.post('/create', optionalAuth, async (req, res) => {
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

        const { data, error } = await (req.supabase || supabase)
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
router.get('/links', requireAuth, authLimiter, async (req, res) => {
    try {
        const { data, error } = await req.supabase
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
router.put('/links/:hash', requireAuth, authLimiter, async (req, res) => {
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
        const { data: existing, error: findError } = await req.supabase
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
        const { data, error } = await req.supabase
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
router.delete('/links/:hash', requireAuth, authLimiter, async (req, res) => {
    try {
        const { hash } = req.params

        // Check ownership
        const { data: existing, error: findError } = await req.supabase
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
        const { error } = await req.supabase
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
router.post('/links/:hash/restore', requireAuth, authLimiter, async (req, res) => {
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

module.exports = router
