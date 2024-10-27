const mysql = require('mysql2');
require('dotenv').config();

// Get parameters from command line arguments
const rollupThreshold = process.argv[2] || 10000;  
const drilldownThreshold = process.argv[3] || 1000;  
const sliceCCU = process.argv[4] || 20000;           
const diceMetacriticMin = process.argv[5] || 60;     
const diceMetacriticMax = process.argv[6] || 70;     

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

// Function to log execution times
const logExecutionTime = (queryName, executionTime) => {
    console.log(`Execution Time for ${queryName}: ${executionTime} ms`);
};

// Function to test Roll-Up Query
const testRollup = async () => {
    const query = `
        SELECT g.genres AS Genre, ROUND(SUM(gf.price), 2) AS Total_Price
        FROM Game_Facts gf
        JOIN Game_Genres gg ON gf.appid = gg.appid
        JOIN Genres g ON gg.GenreID = g.GenreID
        WHERE gf.price IS NOT NULL 
        GROUP BY g.genres
        HAVING Total_Price > ?
        ORDER BY Total_Price DESC;
    `;
    for (let i = 0; i < 2; i++) { 
        const startTime = Date.now();
        db.query(query, [rollupThreshold], (err, results) => {
            const executionTime = Date.now() - startTime;
            logExecutionTime('Roll-Up Query', executionTime);
            if (err) throw err;
        });
    }
};

// Function to test Drill-Down Query
const testDrilldown = async () => {
    const query = `
        SELECT gf.Name, cat.categories AS Category, lang.supported_languages AS Language, SUM(gf.achievements) AS Total_Achievements
        FROM Game_Facts gf
        JOIN Game_Categories gc ON gf.appid = gc.appid
        JOIN Categories cat ON gc.CategoryID = cat.CategoryID
        JOIN Game_Languages gl ON gf.appid = gl.appid
        JOIN Languages lang ON gl.LanguageID = lang.LanguageID
        WHERE gf.achievements > 0
        GROUP BY gf.Name, cat.categories, lang.supported_languages
        HAVING Total_Achievements > ?
        ORDER BY Total_Achievements DESC;
    `;
    for (let i = 0; i < 2; i++) { 
        const startTime = Date.now();
        db.query(query, [drilldownThreshold], (err, results) => {
            const executionTime = Date.now() - startTime;
            logExecutionTime('Drill-Down Query', executionTime);
            if (err) throw err;
        });
    }
};

// Function to test Slice Query
const testSlice = async () => {
    const query = `
        SELECT gf.Name, gf.peak_ccu AS Peak_Concurrent_Users, os.os AS Operating_System
        FROM Game_Facts gf
        JOIN Game_Operating_Systems gos ON gf.appid = gos.appid
        JOIN Operating_Systems os ON gos.osid = os.osid
        WHERE gf.peak_ccu > ? AND os.os = 'Windows' 
        ORDER BY gf.peak_ccu DESC;
    `;
    for (let i = 0; i < 2; i++) { 
        const startTime = Date.now();
        db.query(query, [sliceCCU], (err, results) => {
            const executionTime = Date.now() - startTime;
            logExecutionTime('Slice Query', executionTime);
            if (err) throw err;
        });
    }
};

// Function to test Dice Query
const testDice = async () => {
    const query = `
        SELECT gf.Name, g.genres, gf.metacritic_score
        FROM Game_Facts gf
        JOIN Game_Genres gg ON gf.appid = gg.appid
        JOIN Genres g ON gg.GenreID = g.GenreID
        WHERE g.genres = 'Action' AND gf.metacritic_score BETWEEN ? AND ?
        ORDER BY gf.metacritic_score DESC;
    `;
    for (let i = 0; i < 2; i++) { 
        const startTime = Date.now();
        db.query(query, [diceMetacriticMin, diceMetacriticMax], (err, results) => {
            const executionTime = Date.now() - startTime;
            logExecutionTime('Dice Query', executionTime);
            if (err) throw err;
        });
    }
};

// Run tests
const runTests = async () => {
    await testRollup();
    await testDrilldown();
    await testSlice();
    await testDice();
    db.end(); 
};

runTests();
