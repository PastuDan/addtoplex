const cheerio = require('cheerio')
const request = require('request-promise-native')

const { PTP_HEADERS } = require('./config')
const logger = require('./logger')
const redis = require('./redis')

const cache = redis('CACHE')

const h264Regex = /(x264|h\.264)/i
const h265Regex = /(x265|h\.265)/i
const qualityRegex = /\/(480|720|1080|2160)p/i

const host = `https://passthepopcorn.me`

async function search(query) {
  const cacheKey = `PTP:search:${query}`
  let results = await cache.get(cacheKey)

  if (results) {
    return JSON.parse(results)
  }

  results = await request(`${host}/torrents.php?action=autocomplete&searchstr=${query}`, {
    json: true,
    headers: PTP_HEADERS
  })

  if (!results) {
    logger.warn(`ptp.search() no results returned`)
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

async function fetchMovie(movieId) {
  const cacheKey = `PTP:movie:${movieId}`
  const cached = await cache.get(cacheKey)

  if (cached) {
    return JSON.parse(cached)
  }

  const body = await request(`${host}/torrents.php?id=${movieId}`, {
    headers: PTP_HEADERS
  })

  const $ = cheerio.load(body)

  const poster = $('.sidebar-cover-image').attr('src')
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

      let size = parseFloat(sizeStr)
      if (sizeStr.indexOf('MiB') > -1) {
        size = size / 1024
      }

      return {
        link,
        codec,
        quality,
        size,
        seeders,
        leechers
      }
    })
    .filter(data => data !== null)

  function smallestFromQuality(desiredQuality) {
    const sortedTorrents = torrents
      .filter(({ quality }) => quality === desiredQuality)
      .sort(({ size: a }, { size: b }) => a < b)

    if (sortedTorrents.length > 0) {
      return sortedTorrents[0]
    }
  }

  const movie = {
    poster,
    torrent480: smallestFromQuality(480),
    torrent720: smallestFromQuality(720),
    torrent1080: smallestFromQuality(1080),
    torrent2160: smallestFromQuality(2160)
  }

  cache.setex(cacheKey, 86400, JSON.stringify(movie))
  // TODO cache the formatted result
  return movie
}

module.exports = {
  search,
  fetchMovie
}
