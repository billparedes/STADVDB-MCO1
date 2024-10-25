const express = require('express');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const PORT = 3000;


require('dotenv').config(); // Load environment variables
// MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connect to MySQL
db.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database');
});

// Middleware for static files
app.use(express.static(path.join(__dirname, 'public')));



// Basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Middleware for serving static files (HTML, CSS, JS, etc.)
app.use(express.static(path.join(__dirname, 'views')));

// Now, you can visit 'localhost:3000/index.html'



// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});



// OLAP Query 1: Roll-up Query
app.get('/rollup-genres', (req, res) => {
    console.time('Rollup Query: ');
    const query = `
        SELECT c.categories, g.genres, 
               COUNT(gf.appid) AS total_games, 
               AVG(gf.price) AS avg_price, 
               SUM(gf.estimated_owners) AS total_estimated_owners,
               SUM(gf.positive) AS total_positive_reviews,
               SUM(gf.negative) AS total_negative_reviews
        FROM Game_Facts gf
        JOIN Game_Categories gc ON gf.appid = gc.appid
        JOIN Categories c ON gc.CategoryID = c.CategoryID
        JOIN Game_Genres gg ON gf.appid = gg.appid
        JOIN Genres g ON gg.GenreID = g.GenreID
        GROUP BY c.categories, g.genres
        ORDER BY c.categories, g.genres;
    `;
    db.query(query, (err, results) => {
        console.timeEnd('Rollup Query: ');
        if (err) throw err;
        res.json(results.map(row => ({
            category: row.categories,
            genre: row.genres,
            total_games: row.total_games,
            avg_price: row.avg_price,
            total_estimated_owners: row.total_estimated_owners,
            total_positive_reviews: row.total_positive_reviews,
            total_negative_reviews: row.total_negative_reviews
        })));
    });
});

// OLAP Query 2: Drill-down Query
app.get('/drilldown-games-by-genre', (req, res) => {
    console.time('Drilldown Query: ');
    const query = `
        SELECT gf.Name, g.genres, c.categories, l.supported_languages, os.os, 
               gf.peak_ccu, gf.metacritic_score, gf.release_date, gf.dlc_count
        FROM Game_Facts gf
        JOIN Game_Categories gc ON gf.appid = gc.appid
        JOIN Categories c ON gc.CategoryID = c.CategoryID
        JOIN Game_Genres gg ON gf.appid = gg.appid
        JOIN Genres g ON gg.GenreID = g.GenreID
        JOIN Game_Languages gl ON gf.appid = gl.appid
        JOIN Languages l ON gl.LanguageID = l.LanguageID
        JOIN Game_Operating_Systems gos ON gf.appid = gos.appid
        JOIN Operating_Systems os ON gos.osid = os.osid
        WHERE c.categories = 'Multiplayer' AND g.genres = 'Action'
        ORDER BY gf.peak_ccu DESC;
    `;
    db.query(query, (err, results) => {
        console.timeEnd('Drilldown Query: ');
        if (err) throw err;
        res.json(results.map(row => ({
            name: row.Name,
            genre: row.genres,
            category: row.categories,
            languages: row.supported_languages,
            os: row.os,
            peak_ccu: row.peak_ccu,
            metacritic_score: row.metacritic_score,
            release_date: row.release_date,
            dlc_count: row.dlc_count
        })));
    });
});

// OLAP Query 3: Slice
app.get('/slice-peak-ccu', (req, res) => {
    console.time('Slice Query: ');
    const query = `
        SELECT gf.Name, g.genres, c.categories, os.os, l.supported_languages, 
               gf.metacritic_score, gf.peak_ccu, gf.price, gf.discount
        FROM Game_Facts gf
        JOIN Game_Categories gc ON gf.appid = gc.appid
        JOIN Categories c ON gc.CategoryID = c.CategoryID
        JOIN Game_Genres gg ON gf.appid = gg.appid
        JOIN Genres g ON gg.GenreID = g.GenreID
        JOIN Game_Languages gl ON gf.appid = gl.appid
        JOIN Languages l ON gl.LanguageID = l.LanguageID
        JOIN Game_Operating_Systems gos ON gf.appid = gos.appid
        JOIN Operating_Systems os ON gos.osid = os.osid
        WHERE os.os = 'Windows' AND l.supported_languages = 'English' 
              AND gf.metacritic_score > 75
        ORDER BY gf.metacritic_score DESC;
    `;
    db.query(query, (err, results) => {
        console.timeEnd('Slice Query: ');
        if (err) throw err;
        res.json(results.map(row => ({
            name: row.Name,
            genre: row.genres,
            category: row.categories,
            os: row.os,
            languages: row.supported_languages,
            metacritic_score: row.metacritic_score,
            peak_ccu: row.peak_ccu,
            price: row.price,
            discount: row.discount
        })));
    });
});

// OLAP Query 4: Dice
app.get('/dice-genre-metacritic', (req, res) => {
    console.time('Dice Query: ');
    const query = `
        SELECT gf.Name, g.genres, c.categories, os.os, l.supported_languages, 
               gf.metacritic_score, gf.positive, gf.negative, gf.achievements,
               gf.avgplaytime_forever, gf.avgplaytime_twoweeks, gf.recommendations
        FROM Game_Facts gf
        JOIN Game_Categories gc ON gf.appid = gc.appid
        JOIN Categories c ON gc.CategoryID = c.CategoryID
        JOIN Game_Genres gg ON gf.appid = gg.appid
        JOIN Genres g ON gg.GenreID = g.GenreID
        JOIN Game_Languages gl ON gf.appid = gl.appid
        JOIN Languages l ON gl.LanguageID = l.LanguageID
        JOIN Game_Operating_Systems gos ON gf.appid = gos.appid
        JOIN Operating_Systems os ON gos.osid = os.osid
        WHERE g.genres IN ('Adventure', 'Action') 
              AND c.categories IN ('Single-player', 'Multiplayer')
              AND l.supported_languages = 'Spanish' 
              AND os.os = 'Linux'
        ORDER BY gf.recommendations DESC;
    `;
    db.query(query, (err, results) => {
        console.timeEnd('Dice Query: ');
        if (err) throw err;
        res.json(results.map(row => ({
            name: row.Name,
            genre: row.genres,
            category: row.categories,
            os: row.os,
            languages: row.supported_languages,
            metacritic_score: row.metacritic_score,
            positive: row.positive,
            negative: row.negative,
            achievements: row.achievements,
            avgplaytime_forever: row.avgplaytime_forever,
            avgplaytime_twoweeks: row.avgplaytime_twoweeks,
            recommendations: row.recommendations
        })));
    });
});
