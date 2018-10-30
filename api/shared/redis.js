// @flow

const { REDIS_RATELIMIT_SERVERS, REDIS_CACHE_SERVERS } = require('./config')

/* flow-include
type redisTargets = 'RATELIMIT'|'CACHE'
*/

const Redis = require('ioredis')
const redisOptions = {}

const redises = {
  RATELIMIT: { handle: undefined, servers: REDIS_RATELIMIT_SERVERS },
  CACHE: { handle: undefined, servers: REDIS_CACHE_SERVERS }
}

module.exports = function redis(target /*: redisTargets */, forceNew /*: boolean */ = false) {
  if (!redises[target]) throw new Error(`No such redis "${target}" defined!`)
  if (redises[target].handle && !forceNew) return redises[target].handle
  else {
    let handle
    if (redises[target].servers.length > 1) {
      handle = new Redis.Cluster(redises[target].servers, { redisOptions })
    } else if (redises[target].servers.length === 1) {
      handle = new Redis(
        redises[target].servers[0].port,
        redises[target].servers[0].host,
        redisOptions
      )
    } else {
      // Dummy, for testing - errors on use
      handle = new Redis({
        lazyConnect: true,
        enableOfflineQueue: false,
        reconnectOnError: () => false
      })
    }
    if (forceNew) return handle
    else {
      redises[target].handle = handle
      return redises[target].handle
    }
  }
}
