import React, { Component } from 'react'
import './App.css'

import Movie from './Movie'

let searchTimeoutId
let savedSearches
try {
  savedSearches = localStorage.getItem('savedSearches')
  savedSearches = savedSearches ? JSON.parse(savedSearches) : []
} catch {}

class App extends Component {
  state = {
    shows: [],
    movies: [],
    toastType: null,
    toastMessage: null,
    desiredQuality: 1080,
    savedSearches: savedSearches || []
  }

  toast(toastType, toastMessage) {
    this.setState({ toastType, toastMessage })
    window.setTimeout(() => this.setState({ toastType: null, toastMessage: null }), 8000)
  }

  update = e => {
    const query = e.target.value
    this.setState({ query })
    if (!e.target.value) {
      return
    }

    //TODO adjust timeout below and also add abort controller
    window.clearTimeout(searchTimeoutId)
    searchTimeoutId = window.setTimeout(() => this.search(query), 150)
  }

  search = query => {
    window
      .fetch(`/api/search/${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(movies => this.setState({ movies }))
      .catch(err => {
        this.toast('error', 'Could not fetch movies')
      })
  }

  saveMovie(query) {
    try {
      let savedSearches = localStorage.getItem('savedSearches')
      if (savedSearches) {
        savedSearches = JSON.parse(savedSearches)
        if (savedSearches.map(query => query.toLowerCase()).includes(query)) {
          return
        }
      } else {
        savedSearches = []
      }

      savedSearches.push(query)
      localStorage.setItem('savedSearches', JSON.stringify(savedSearches))
    } catch {}
  }

  render() {
    const { shows, movies, toastType, toastMessage, desiredQuality, query } = this.state
    return (
      <div className="App">
        {toastMessage ? <div className={`toast ${toastType}`}>{toastMessage}</div> : null}
        <input type="text" onChange={this.update} placeholder="Search TV &amp; Movies" />
        {savedSearches.length ? (
          <div className="saved-searches">
            <h2>Saved Movies</h2>
            {savedSearches.map(query => (
              <div>{query}</div>
            ))}
          </div>
        ) : null}
        {query ? (
          shows.length ? (
            shows.map(({ seasons }) => (
              <div
                className="search-result"
                style={{ backgroundImage: this.state.bannerBackground }}
              >
                <div className="series-name">{this.props.name}</div>
                <div className="overflow">
                  {seasons.map(season => (
                    <ul key={season.seasonNumber} className="series-torrent-list cf">
                      <h1>Season {season.seasonNumber}</h1>
                      {season.episodes.map(episode => (
                        <li
                          key={episode.episodeNumber}
                          onClick={this.addTorrent.bind(this, episode.torrents[0].downloadUrl)}
                          className="series-torrent"
                        >
                          <div className="episode-number">{episode.episodeNumber}</div>
                          <div className="episode-quality">{episode.torrents[0].quality}</div>
                        </li>
                      ))}
                    </ul>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="noresults">No TV Results</div>
          )
        ) : null}
        {query ? <div onClick={() => this.saveMovie(query)}>Save Search: {query}</div> : null}
        {query ? (
          movies.length ? (
            <div className="movies">
              {movies.map(movie => (
                <Movie desiredQuality={desiredQuality} {...movie} />
              ))}
            </div>
          ) : (
            <div className="noresults">No Movie Results</div>
          )
        ) : null}
      </div>
    )
  }
}

export default App
