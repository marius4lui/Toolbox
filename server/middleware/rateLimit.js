const rateLimit = require('express-rate-limit')

// Rate limiting for unauthenticated requests
const guestLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
})

// Rate limiting for authenticated requests (more lenient)
const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
})

module.exports = {
    guestLimiter,
    authLimiter
}
