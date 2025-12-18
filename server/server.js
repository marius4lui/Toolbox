// Toolbox Redirect Server
// Hosted at: toolbox.qhrd.online
// Features:
// - POST /api/create → Create new redirect
// - GET /:hash → Redirect to target URL

const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const app = express()
const PORT = process.env.PORT || 3000

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://supabase.qhrd.online'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1ODAyOTg4MCwiZXhwIjo0OTEzNzAzNDgwLCJyb2xlIjoiYW5vbiJ9.NM4IQDxdwgeSpIxB-AMVm34i70g7XJKtKxf2imns9fc'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Middleware
app.use(cors())
app.use(express.json())

// Generate random hash
function generateHash(length = 10) {
    return crypto.randomBytes(length).toString('base64url').slice(0, length)
}

// Create new redirect
app.post('/api/create', async (req, res) => {
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

        // Insert into database
        const { data, error } = await supabase
            .from('redirects')
            .insert({ hash, target_url: url })
            .select()
            .single()

        if (error) {
            console.error('Supabase error:', error)
            return res.status(500).json({ error: 'Failed to create redirect' })
        }

        res.json({
            success: true,
            hash: data.hash,
            shortUrl: `https://toolbox.qhrd.online/${data.hash}`,
            targetUrl: url
        })

    } catch (error) {
        console.error('Error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Redirect to target URL
app.get('/:hash', async (req, res) => {
    try {
        const { hash } = req.params

        // Lookup redirect
        const { data, error } = await supabase
            .from('redirects')
            .select('target_url')
            .eq('hash', hash)
            .single()

        if (error || !data) {
            return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Not Found</title>
          <style>
            body { font-family: system-ui; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .container { text-align: center; }
            h1 { color: #0070f3; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>404</h1>
            <p>Redirect not found</p>
          </div>
        </body>
        </html>
      `)
        }

        // Increment click counter (async, don't wait)
        supabase
            .from('redirects')
            .update({ clicks: supabase.rpc('increment_clicks', { row_hash: hash }) })
            .eq('hash', hash)
            .then(() => { })
            .catch(() => { })

        // Redirect
        res.redirect(302, data.target_url)

    } catch (error) {
        console.error('Error:', error)
        res.status(500).send('Internal server error')
    }
})

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Toolbox Redirect Service',
        version: '1.0.0'
    })
})

app.listen(PORT, () => {
    console.log(`🚀 Toolbox Redirect Server running on port ${PORT}`)
})
