import React, { Component } from 'react'
import './App.css'

let searchTimeoutId
class App extends Component {
  state = {
    shows: [],
    movies: [],
    toastType: null,
    toastMessage: null
  }

  toast(toastType, toastMessage) {
    this.setState({ toastType, toastMessage })
    window.setTimeout(() => this.setState({ toastType: null, toastMessage: null }), 8000)
  }

  update = e => {
    if (!e.target.value) {
      return
    }

    const query = e.target.value
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

  render() {
    const { shows, movies, toastType, toastMessage } = this.state
    return (
      <div className="App">
        {toastMessage ? <div className={`toast ${toastType}`}>{toastMessage}</div> : null}
        <input type="text" onChange={this.update} placeholder="Search TV &amp; Movies" />
        {shows.length ? (
          shows.map(({ seasons }) => (
            <div className="search-result" style={{ backgroundImage: this.state.bannerBackground }}>
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
          <div>No TV Results</div>
        )}
        {movies.length ? (
          <div>
            {movies.map(({ title, year, id }) => (
              <div key={id}>
                {year} - {title}
              </div>
            ))}
          </div>
        ) : (
          <div>No Movie Results</div>
        )}
      </div>
    )
  }
}

export default App
