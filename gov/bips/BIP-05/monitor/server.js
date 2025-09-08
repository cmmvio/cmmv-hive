const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Create HTTP server
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    // Serve the HTML file
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading index.html');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else if (req.url === '/style.css') {
    // Serve CSS file
    fs.readFile(path.join(__dirname, 'style.css'), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading style.css');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/css' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

// Path to issues.json file
const issuesFile = path.join(__dirname, '..', 'issues.json');

// Function to send issues data to all connected clients
function broadcastIssues() {
  if (clients.size === 0) return;

  fs.readFile(issuesFile, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading issues.json:', err);
      return;
    }

    try {
      const issues = JSON.parse(data);
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(issues));
        }
      });
    } catch (parseErr) {
      console.error('Error parsing issues.json:', parseErr);
    }
  });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);

  // Send current issues data immediately
  broadcastIssues();

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Watch for file changes
let fileWatcher = null;

function startFileWatcher() {
  if (fileWatcher) {
    fileWatcher.close();
  }

  fileWatcher = fs.watch(issuesFile, { persistent: true }, (eventType) => {
    if (eventType === 'change') {
      console.log('issues.json changed, broadcasting update...');
      // Debounce updates to avoid too frequent broadcasts
      setTimeout(broadcastIssues, 100);
    }
  });

  console.log('File watcher started for:', issuesFile);
}

// Initial broadcast and start watching
setTimeout(() => {
  broadcastIssues();
  startFileWatcher();
}, 1000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  if (fileWatcher) {
    fileWatcher.close();
  }
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Monitoring: ${issuesFile}`);
});
