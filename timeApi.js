const http = require('http');
const https = require('https');

function fetchTimeHomePage(callback) {
    https.get('https://time.com', (res) => {

        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });


        res.on('end', () => {

            callback(null, data);
        });
    }).on('error', (err) => {
        callback(err, null);
    });
}


function extractLatestStories(html) {


    const patterns = [

        /<li class="latest-stories__item">[\s\S]*?<a href="(.*?)">([\s\S]*?)<\/a>/g,

        /<article[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g,
        /<div[^>]*class="[^"]*story[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g,
        /<h[1-6][^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g
    ];

    let stories = [];

    for (let i = 0; i < patterns.length; i++) {
        const regex = patterns[i];
        let match;
        const tempStories = [];

        while ((match = regex.exec(html)) !== null && tempStories.length < 6) {
            const link = match[1].startsWith('http') ? match[1] : `https://time.com${match[1]}`;
            let title = match[2].replace(/\s+/g, ' ').trim();

            title = title.replace(/<\/?span[^>]*>/g, '').trim();

            if (title.length > 10 && link.includes('time.com')) {
                tempStories.push({ title, link });
            }
        }

        if (tempStories.length > 0) {
            stories = tempStories;
            break;
        }
    }

    return stories;
}


const server = http.createServer((req, res) => {


    if (req.url === '/getTimeStories' && req.method === 'GET') {


        fetchTimeHomePage((err, html) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to fetch TIME homepage', details: err.message }));
                return;
            }



            const stories = extractLatestStories(html);


            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(stories, null, 2));
        });
    } else {
        // Handle invalid requests
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found - Use GET /getTimeStories to get latest TIME stories');
    }
});


const PORT = 8080;
server.listen(PORT, () => {
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error('💡 Port 8080 is already in use. Try a different port or stop the existing process.');
        }
    });
});


process.on('SIGINT', () => {
    server.close(() => {
        process.exit(0);
    });
});
