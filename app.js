const express = require('express');
const mysql = require('mysql2');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000;

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to MySQL');
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Roll-Up Endpoint
app.get('/rollup', (req, res) => {
    console.time('Rollup Query');
    const query = `
        SELECT os.os AS Operating_System, lang.supported_languages AS Language, ROUND(AVG(gf.avgplaytime_forever), 2) AS Average_Playtime
        FROM Game_Facts gf
        JOIN Game_Operating_Systems gos ON gf.appid = gos.appid
        JOIN Operating_Systems os ON gos.osid = os.osid
        JOIN Game_Languages gl ON gf.appid = gl.appid
        JOIN Languages lang ON gl.LanguageID = lang.LanguageID
        GROUP BY os.os, lang.supported_languages
        ORDER BY Average_Playtime DESC;
    `;
    db.query(query, (err, results) => {
        console.timeEnd('Rollup Query');
        if (err) throw err;


        res.json(results);
    });
});

// Drill-Down Endpoint
app.get('/drilldown', (req, res) => {
    console.time('Drilldown Query');
    const query = `
        SELECT      cat.categories AS Category, gen.genres AS Genre, SUM(gf.achievements) AS Total_Achievements
        FROM        Game_Facts gf
        JOIN        Game_Categories gc ON gf.appid = gc.appid
        JOIN        Categories cat ON gc.CategoryID = cat.CategoryID
        JOIN        Game_Genres gg ON gf.appid = gg.appid
        JOIN        Genres gen ON gg.GenreID = gen.GenreID
        GROUP BY    cat.categories, gen.genres
        ORDER BY    Total_Achievements DESC;
    `; 
    db.query(query, (err, results) => {
        console.timeEnd('Drilldown Query');
        if (err) throw err;
        res.json(results);
    });
});

// Slice Endpoint
app.get('/slice', (req, res) => {
    console.time('Slice Query');
    const query = `
        SELECT      gf.Name, gf.peak_ccu AS Peak_Concurrent_Users, os.os AS Operating_System
        FROM        Game_Facts gf
        JOIN        Game_Operating_Systems gos ON gf.appid = gos.appid
        JOIN        Operating_Systems os ON gos.osid = os.osid
        WHERE       gf.peak_ccu > 10000 AND os.os = 'Windows'
		ORDER BY    gf.peak_ccu DESC;
    `;
    db.query(query, (err, results) => {
        console.timeEnd('Slice Query');
        if (err) throw err;
        res.json(results);
    });
});

// Dice Endpoint
app.get('/dice', (req, res) => {
    console.time('Dice Query');
    const query = `
        SELECT      gf.Name, g.genres, gf.metacritic_score, gf.price
        FROM        Game_Facts gf
        JOIN        Game_Genres gg ON gf.appid = gg.appid
        JOIN        Genres g ON gg.GenreID = g.GenreID
        WHERE       g.genres = 'Action' AND gf.metacritic_score BETWEEN 80 AND 90
        ORDER BY    gf.metacritic_score DESC;
    `; 
    db.query(query, (err, results) => {
        console.timeEnd('Dice Query');
        if (err) throw err;
        res.json(results);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
