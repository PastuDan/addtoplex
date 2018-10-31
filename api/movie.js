const logger = require('./shared/logger')
const { search, fetchMovie } = require('./shared/ptp')
const redis = require('./shared/redis')

const cache = redis('CACHE')

function sortQualitySeeds(torrentA, torrentB) {
  // sort in descending order of quality
  const qualityA = torrentA.quality === 'SD' ? 480 : parseInt(torrentA.quality, 10)
  const qualityB = torrentB.quality === 'SD' ? 480 : parseInt(torrentB.quality, 10)

  const delta = qualityB - qualityA
  if (delta !== 0) {
    return delta
  }

  // if qualities are same, sort on seeds
  return torrentB.seeds - torrentA.seeds
}

module.exports = async function movieHandler(req, res) {
  for (let i = 0; i < results.length; i++) {
    // TODO check if stale, queue update, push response back to clients via websocket
    // ie, never block on these requests
    let movie = {}
    try {
      movie = await fetchMovie(results[i].id)
    } catch (err) {
      logger.error('searchHandler() Movie request error', {
        errMsg: err.message,
        code: err.statusCode
      })
      return res.sendStatus(500)
    }

    results[i] = Object.assign(results[i], movie)
  }
}

// module.exports = class SeriesSearchResult extends React.Component {
//   constructor(props) {
//     super(props)

//     this.state = {
//       bannerBackground: overlay,
//       seasons: []
//     }
//   }

//   render() {
//     console.error('render loop')

//     console.log(this.state.seasons)
//   }

//   addTorrent(downloadUrl) {
//     console.log('RESULT: downloading torrent', downloadUrl)
//     dispatch('addTorrent', downloadUrl)
//   }

//   componentDidMount() {
//     console.log('mounted', this.props.id, this.props.name)
//     const data = JSON.parse(window.localStorage.getItem(`series-${this.props.id}-torrents-v5`))
//     if (data && data.seasons && data.seasons.length !== 0) {
//       this.setState({
//         seasons: data.seasons,
//         bannerBackground: data.bannerBackground
//       })
//       return
//     }

//     // get list of available torrents
//     const headers = {
//       pragma: 'no-cache',
//       'x-requested-with': 'XMLHttpRequest',
//       'accept-language': 'en-US,en;q=0.8',
//       'user-agent':
//         'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
//       accept: 'application/json, text/javascript, */*; q=0.01',
//       'cache-control': 'no-cache',
//       authority: 'broadcasthe.net',
//       cookie:
//         '__cfduid=d5f3bbdb28348337d68ec27ab288b65b01487483269; PHPSESSID=9tvrvt7n8l7c26ture4in9sta3; keeplogged=1MQHpw0Id6IlC0KC9lG788oqUXgcB%2Fk0fSk9jen%2FLxb5awbLR54gIqXz2ZX9KUzZKB0kvqlexZ6Ui74bjBlPR%2Fnx%2BUh8zQVUv2DSQXkHmJQHS4dx4B1lfr1OaU2auBHRj8%2FWMk6jqesQyTjqmessvlJjM8AG7D5Rm%2FFHBmQ1JJmjJXXOVYEWjpf6H0Ro7j%2BdW39%2BtdKSDw2UNUttGh3tAGD1sbPFPq0AzAamidfXfb567wKzcry9RorwANwtPUJL'
//     }

//     const options = {
//       url: `https://broadcasthe.net/series.php?id=${this.props.id}`,
//       headers: headers
//     }

//     request(options, this.seriesDataCallback.bind(this))
//     this.seriesDataCallback(null, { statusCode: 200 }, sampleResponse)
//   }

//   seriesDataCallback(err, res, body) {
//     if (err || res.statusCode !== 200) {
//       console.log('RESULT: RETRIEVAL ERROR', err)
//     }

//     console.log(`retrieved series ${this.props.id} (${this.props.name}) in ${res.elapsedTime} ms`)

//     const $ = cheerio.load(body)
//     const bannerUrl = $('#banner').attr('src')
//     let seasons = [] // list of season objects
//     let torrents = [] // list of torrent objects in the season
//     let episodes = []
//     let lastSeasonNumber = null
//     let seasonNumber
//     const $torrentGroup = $('.group_torrent.first')
//     $torrentGroup.each(function(index) {
//       const $ele = $(this)
//       const seasonEpisodeString = $ele.find('.episode, .season').text()
//       console.log(seasonEpisodeString)
//       const match = /S(\d+)E(\d+)|Season (\d+)/gi.exec(seasonEpisodeString)
//       const episodeNumber = parseInt(match ? match[2] : 0, 10) || 'All'
//       seasonNumber = parseInt(match ? match[1] || match[3] : 0, 10)

//       // initialize the last season number if this is the first torrent
//       if (lastSeasonNumber === null) {
//         lastSeasonNumber = seasonNumber
//       }

//       if (seasonNumber !== lastSeasonNumber) {
//         seasons.push({
//           seasonNumber: lastSeasonNumber,
//           episodes
//         })
//         episodes = []
//         lastSeasonNumber = seasonNumber
//       }

//       torrents = []
//       // loop through the group of torrents and add them all to the list
//       const nextUntil = $ele.nextUntil('.group_torrent.first')
//       nextUntil.each(function() {
//         const $torrent = $(this)
//         const downloadUrl = `https://broadcasthe.net/${$torrent
//           .find('a')
//           .first()
//           .attr('href')}`
//         const meta = $torrent
//           .find('a')
//           .last()
//           .text()
//         const $number = $torrent.find('.number')
//         const size = $($number[0]).text()
//         const seeds = parseInt(
//           $($number[2])
//             .text()
//             .replace(/,/g, ''),
//           10
//         )
//         const match = /(sd|(720|1080)p)/gi.exec(meta)
//         const quality = match ? match[1] : 'other|' + meta + '|' + JSON.stringify(match)
//         torrents.push({
//           quality,
//           meta,
//           downloadUrl,
//           size,
//           seeds
//         })
//       })

//       torrents = torrents.sort(sortQualitySeeds)

//       episodes.push({
//         episodeNumber,
//         torrents: torrents
//       })
//     })

//     // // push the final season onto the array
//     // seasons.push({
//     //   seasonNumber,
//     //   episodes
//     // })

//     const state = {
//       bannerBackground: `${overlay},  url("https:${bannerUrl}")`,
//       seasons
//     }

//     console.log(state)

//     window.localStorage.setItem(`series-${this.props.id}-torrents-v5`, JSON.stringify(state))
//     this.setState(state)
//   }

//   componentWillUnmount() {
//     // TODO: stop any pending requests
//   }
// }
