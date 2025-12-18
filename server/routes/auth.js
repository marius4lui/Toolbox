const express = require('express')
const { createClient } = require('@supabase/supabase-js')
const { requireAuth, SUPABASE_URL, SUPABASE_ANON_KEY } = require('../middleware/auth')
const { guestLimiter, authLimiter } = require('../middleware/rateLimit')

const router = express.Router()
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Register
router.post('/register', guestLimiter, async (req, res) => {
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
router.post('/login', guestLimiter, async (req, res) => {
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
router.post('/logout', requireAuth, async (req, res) => {
    try {
        // Note: Supabase handles logout client-side, but we can invalidate server-side if needed
        res.json({ success: true, message: 'Logged out successfully' })
    } catch (error) {
        console.error('Logout error:', error)
        res.status(500).json({ error: 'Logout failed' })
    }
})

// Validate token
router.get('/validate', requireAuth, async (req, res) => {
    res.json({
        success: true,
        valid: true,
        user: {
            id: req.user.id,
            email: req.user.email
        }
    })
})

const getAdminClient = () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
    }
    return createClient(SUPABASE_URL, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}

// Change Password
router.put('/change-password', requireAuth, authLimiter, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password required' })
        }

        // Verify current password using the normal client
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: req.user.email,
            password: currentPassword
        })

        if (signInError) {
            return res.status(401).json({ error: 'Incorrect current password' })
        }

        // Update to new password using Admin client
        const admin = getAdminClient()
        const { error } = await admin.auth.admin.updateUserById(req.user.id, { password: newPassword })

        if (error) return res.status(400).json({ error: error.message })

        res.json({ success: true, message: 'Password updated successfully' })
    } catch (error) {
        console.error('Change password error:', error)
        res.status(500).json({ error: 'Failed to update password' })
    }
})

// Change Email
router.put('/change-email', requireAuth, authLimiter, async (req, res) => {
    try {
        const { currentPassword, email } = req.body

        if (!currentPassword || !email) {
            return res.status(400).json({ error: 'Current password and new email required' })
        }

        // Verify current password
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: req.user.email,
            password: currentPassword
        })

        if (signInError) {
            return res.status(401).json({ error: 'Incorrect current password' })
        }

        // Update email using Admin client
        const admin = getAdminClient()
        const { error } = await admin.auth.admin.updateUserById(req.user.id, { email: email })

        if (error) return res.status(400).json({ error: error.message })

        res.json({ success: true, message: 'Email update initiated. Please check your inbox.' })
    } catch (error) {
        console.error('Change email error:', error)
        res.status(500).json({ error: 'Failed to update email' })
    }
})

// Delete Account
router.delete('/delete-account', requireAuth, authLimiter, async (req, res) => {
    try {
        const userId = req.user.id
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!serviceRoleKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
            return res.status(500).json({ error: 'Server configuration error: Unable to process deletion' })
        }

        const supabaseAdmin = createClient(SUPABASE_URL, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (error) throw error

        res.json({ success: true, message: 'Account deleted successfully' })
    } catch (error) {
        console.error('Delete account error:', error)
        res.status(500).json({ error: 'Failed to delete account: ' + error.message })
    }
})

module.exports = router
