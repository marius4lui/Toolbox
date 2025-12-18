// Toolbox Link Redirect Server
// Hosted at: links.qhrd.online
// Simple, fast redirect service - NO API routes
// All API calls go to api.qhrd.online

const express = require('express')
const { createClient } = require('@supabase/supabase-js')

const app = express()
const PORT = process.env.PORT || 3001

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://supabase.qhrd.online'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1ODAyOTg4MCwiZXhwIjo0OTEzNzAzNDgwLCJyb2xlIjoiYW5vbiJ9.NM4IQDxdwgeSpIxB-AMVm34i70g7XJKtKxf2imns9fc'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Toolbox Link Redirect Service',
        version: '2.0.0',
        note: 'Use links.qhrd.online/{hash} to redirect. API at api.qhrd.online'
    })
})

// Redirect to target URL
app.get('/:hash', async (req, res) => {
    try {
        const { hash } = req.params

        // Lookup redirect
        const { data, error } = await supabase
            .from('redirects')
            .select('target_url, is_active, expires_at')
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
            h1 { color: #667eea; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>404</h1>
            <p>Link not found</p>
          </div>
        </body>
        </html>
      `)
        }

        // Check if expired or inactive
        const now = new Date()
        const expiresAt = new Date(data.expires_at)

        if (!data.is_active || expiresAt < now) {
            return res.status(410).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link Expired</title>
          <style>
            body { font-family: system-ui; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .container { text-align: center; }
            h1 { color: #f59e0b; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Link Expired</h1>
            <p>This link is no longer active</p>
          </div>
        </body>
        </html>
      `)
        }

        // Increment click counter (async, don't wait)
        supabase.rpc('increment_clicks', { row_hash: hash })
            .then(() => { })
            .catch(() => { })

        // Redirect
        res.redirect(302, data.target_url)

    } catch (error) {
        console.error('Error:', error)
        res.status(500).send('Internal server error')
    }
})

app.listen(PORT, () => {
    console.log(`🔗 Toolbox Link Redirect Server running on port ${PORT}`)
})
