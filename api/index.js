const express = require('express')
const app = express()
const port = 4000

app.get('/api/search/:query', require('./search'))
app.get('/api/movie/:id', require('./movie'))

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
