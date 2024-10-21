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



// OLAP Query 1: Roll-up Query (Group by Genre)
app.get('/rollup-genres', (req, res) => {
    const query = `
        SELECT g.genres, COUNT(gf.appid) AS game_count, SUM(gf.estimated_owners) AS total_owners
        FROM Game_Facts gf
        JOIN Game_Genres gg ON gf.appid = gg.appid
        JOIN Genres g ON gg.GenreID = g.GenreID
        GROUP BY g.genres
        ORDER BY total_owners DESC;
    `;
    db.query(query, (err, results) => {
        if (err) throw err;
        res.json(results.map(row => ({
            genres: row.genres,
            game_count: row.game_count,
            total_owners: row.total_owners
        })));
    });
});

// OLAP Query 2: Drill-down Query (Number of games by genre for a specific year)
app.get('/drilldown-games-by-genre', (req, res) => {
    const query = `
        SELECT g.genres, COUNT(gf.appid) AS Total_Games
        FROM Game_Facts gf
        JOIN Game_Genres gg ON gf.appid = gg.appid
        JOIN Genres g ON gg.GenreID = g.GenreID
        WHERE YEAR(gf.release_date) = 2023
        GROUP BY g.genres;
    `;
    db.query(query, (err, results) => {
        if (err) throw err;
        res.json(results.map(row => ({
            genres: row.genres,
            Total_Games: row.Total_Games
        })));
    });
});

// OLAP Query 3: Slice (Filter by peak concurrent users above 10,000)
app.get('/slice-peak-ccu', (req, res) => {
    const query = `
        SELECT gf.Name, gf.peak_ccu, gf.estimated_owners, gf.metacritic_score
        FROM Game_Facts gf
        WHERE gf.peak_ccu > 10000
        ORDER BY gf.peak_ccu DESC;
    `;
    db.query(query, (err, results) => {
        if (err) throw err;
        res.json(results.map(row => ({
            Name: row.Name,
            peak_ccu: row.peak_ccu,
            estimated_owners: row.estimated_owners,
            metacritic_score: row.metacritic_score
        })));
    });
});

// OLAP Query 4: Dice (Filter by genre and metacritic score range)
app.get('/dice-genre-metacritic', (req, res) => {
    const query = `
        SELECT gf.Name, g.genres, gf.metacritic_score, gf.price
        FROM Game_Facts gf
        JOIN Game_Genres gg ON gf.appid = gg.appid
        JOIN Genres g ON gg.GenreID = g.GenreID
        WHERE g.genres = 'Action' AND gf.metacritic_score BETWEEN 80 AND 90
        ORDER BY gf.metacritic_score DESC;
    `;
    db.query(query, (err, results) => {
        if (err) throw err;
        res.json(results.map(row => ({
            Name: row.Name,
            genres: row.genres,
            metacritic_score: row.metacritic_score,
            price: row.price
        })));
    });
});
