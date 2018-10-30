// @flow

const Limiter = require('async-ratelimiter')
const redis = require('../_shared/redis')
const logger = require('../_shared/logger')
const { getRealIp } = require('./server')
const redisRateLimits = redis('RATELIMIT')

const rateLimiters = {
  api: {
    limiter: new Limiter({
      db: redisRateLimits,
      // 500 in development, 250 in production - flat ratelimit per ip
      max: process.env.NODE_ENV === 'development' ? 500 : 250,
      duration: 60 * 60 * 1000
    }),
    key: req => 'rl:' + getRealIp(req)
  },
  search: {
    limiter: new Limiter({
      db: redisRateLimits,
      max: process.env.NODE_ENV === 'development' ? 1000 : 500,
      duration: 60 * 60 * 1000
    }),
    key: req => 'rls:' + getRealIp(req)
  },
  project: {
    limiter: new Limiter({
      db: redisRateLimits,
      max: 100,
      duration: 60 * 60 * 1000
    }),
    key: req => 'rlp:' + getRealIp(req)
  },
  bundle: {
    limiter: new Limiter({
      db: redisRateLimits,
      max: 1000,
      duration: 60 * 60 * 1000
    }),
    key: req => 'rlb:' + getRealIp(req)
  },
  forceUpdate: {
    limiter: new Limiter({
      db: redisRateLimits,
      max: 25,
      duration: 15 * 60 * 1000
    }),
    key: req => 'rlfu:' + getRealIp(req)
  }
}

function ratelimits (limiterName /*: string */) {
  return async function ratelimitHandler (
    req /*: express$Request */,
    res /*: express$Response */,
    next /*: express$NextFunction */
  ) {
    let limit
    const limitConfig = rateLimiters[limiterName]

    if (!limitConfig) {
      res.status(500).send({ error: 'ratelimit_config_error' })
      return
    }

    try {
      limit = await limitConfig.limiter.get({ id: limitConfig.key(req) })
    } catch (err) {
      logger.warn('ratelimits() limiter.get() failed', { limiterName })
      return next()
    }

    res.set(`X-${limiterName.toUpperCase()}-RATELIMIT-REMAINING`, limit.remaining)
    res.set(`X-${limiterName.toUpperCase()}-RATELIMIT-RESET`, limit.reset)
    if (!limit.remaining) {
      logger.info(`Reached ${limiterName} ratelimit`, { ip: getRealIp(req) })
      res.sendStatus(429)
    } else {
      next()
    }
  }
}

module.exports = ratelimits
