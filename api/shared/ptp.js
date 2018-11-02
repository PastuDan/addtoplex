const cheerio = require('cheerio')
const request = require('request-promise-native')

const { PTP_HEADERS } = require('./config')
const logger = require('./logger')
const redis = require('./redis')

const cache = redis('CACHE')

const h264Regex = /(x264|h\.264)/i
const h265Regex = /(x265|h\.265)/i
const qualityRegex = /\/(480|720|1080|2160)p/i
const sceneRegex = /\/scene/i
const threeDRegex = /\/3d/i

const host = `https://passthepopcorn.me`

async function search(query) {
  const cacheKey = `PTP:search:${query}`
  let results = await cache.get(cacheKey)

  if (results === 'false') {
    return []
  }

  if (results) {
    return JSON.parse(results)
  }

  results = await request(`${host}/torrents.php?action=autocomplete&searchstr=${query}`, {
    json: true,
    headers: PTP_HEADERS
  })

  if (!Array.isArray(results)) {
    throw new Error(`ptp.search() results not array, are you logged in?`)
  }

  if (!results || !results[1]) {
    await cache.setex(cacheKey, 86400, false)
    return []
  }

  const formattedResults = []
  for (let i = 0; i < results[1].length; i++) {
    formattedResults[i] = {
      title: results[1][i],
      id: results[2][i].split('=')[1],
      year: results[3][i]
    }
  }

  await cache.setex(cacheKey, 3600, JSON.stringify(formattedResults))
  return formattedResults
}

async function fetchMovie(movieId, { cacheOnly = false } = {}) {
  const cacheKey = `PTP:movie:${movieId}`
  const cached = await cache.get(cacheKey)

  if (cached) {
    return JSON.parse(cached)
  }

  if (cacheOnly) {
    return
  }

  const body = await request(`${host}/torrents.php?id=${movieId}`, {
    headers: PTP_HEADERS
  })

  const $ = cheerio.load(body)

  const poster = $('.sidebar-cover-image').attr('src')
  const rating = parseFloat(
    $('.rating')
      .eq(1)
      .text()
  )
  const torrents = $('.torrent_table .group_torrent.group_torrent_header')
    .toArray()
    .map(function(torrent) {
      const tds = $(torrent).find('td')
      const details = tds
        .eq(0)
        .text()
        .replace(/\s/g, '')

      const link = `${host}/${tds
        .eq(0)
        .find('a')
        .eq(0)
        .attr('href')}`
      const sizeStr = tds.eq(1).text()
      const seeders = parseInt(tds.eq(3).text(), 10)
      const leechers = parseInt(tds.eq(4).text(), 10)

      const codec = h264Regex.test(details) ? 'H.264' : h265Regex.test(details) ? 'H.265' : null
      // Filter out torrents with undesired codecs
      if (!['H.264', 'H.265'].includes(codec)) {
        return null
      }

      // Filter out torrents with low / obscure qualities
      let quality = details.match(qualityRegex)
      if (!quality) {
        return null
      } else {
        quality = parseInt(quality[1], 10)
      }

      // Filter out 3D movies
      if (details.match(threeDRegex)) {
        return null
      }

      let size = parseFloat(sizeStr)
      if (sizeStr.indexOf('MiB') > -1) {
        size = size / 1024
      }

      return {
        isScene: sceneRegex.test(details),
        link,
        codec,
        quality,
        size,
        seeders,
        leechers
      }
    })
    .filter(data => data !== null)

  const totalSeeders = torrents.reduce((total, { seeders }) => seeders + total, 0)
  let dtorrents = torrents.map(torrent => {
    torrent.avgSeeders = torrent.seeders / totalSeeders
    return torrent
  })

  const filteredTorrents = []
  torrents
    .sort(
      ({ seeders: sA, quality: qA, isScene: isA }, { seeders: sB, quality: qB, isScene: isB }) => {
        // First sort by quality, ASC
        const qualityDiff = qB - qA
        if (qualityDiff !== 0) {
          return qualityDiff
        }

        // If same quality, pick scene releases first
        const sceneDiff = isB - isA
        if (sceneDiff !== 0) {
          return sceneDiff
        }

        // If multiple scene releases, then pick the most seeded, DESC
        return sB - sA
      }
    )
    .forEach(torrent => {
      const lastTorrent = filteredTorrents[filteredTorrents.length - 1]
      if (!lastTorrent || (lastTorrent && lastTorrent.quality !== torrent.quality)) {
        filteredTorrents.push(torrent)
      }
    })

  const movie = {
    poster,
    rating,
    torrents: filteredTorrents
  }

  cache.setex(cacheKey, 86400 * 7, JSON.stringify(movie))
  return movie
}

module.exports = {
  search,
  fetchMovie
}
