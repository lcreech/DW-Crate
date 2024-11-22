const CLIENT_ID = 'your_client_id'; // Replace with your Spotify app's client ID
const REDIRECT_URI = 'https://your-netlify-site.netlify.app'; // Update with your deployed Netlify URL
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SCOPES = 'playlist-read-private playlist-modify-private';

let accessToken;

// Handle authentication
document.getElementById('auth-button').addEventListener('click', () => {
  const authUrl = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${encodeURIComponent(SCOPES)}&response_type=token`;
  window.location.href = authUrl;
});

// Extract token from URL
window.onload = () => {
  const hash = window.location.hash;
  if (hash) {
    accessToken = new URLSearchParams(hash.substring(1)).get('access_token');
    if (accessToken) {
      document.getElementById('auth-section').classList.add('hidden');
      document.getElementById('playlist-section').classList.remove('hidden');
    }
  }
};

// Fetch Discover Weekly playlists
document.getElementById('fetch-dw-playlists').addEventListener('click', async () => {
  const response = await fetch('https://api.spotify.com/v1/me/playlists', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  const dwPlaylists = data.items.filter((playlist) => playlist.name.includes('Discover Weekly'));

  const container = document.getElementById('playlists-container');
  container.innerHTML = ''; // Clear existing content
  dwPlaylists.forEach((playlist) => {
    const div = document.createElement('div');
    div.textContent = playlist.name;
    div.style.margin = '10px 0';
    container.appendChild(div);
  });

  if (dwPlaylists.length > 0) {
    document.getElementById('create-playlist').classList.remove('hidden');
  }
});

// Create aggregated playlist
document.getElementById('create-playlist').addEventListener('click', async () => {
  const playlistName = 'DW Crate Aggregated Playlist';
  const createResponse = await fetch('https://api.spotify.com/v1/me/playlists', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: playlistName,
      public: false,
    }),
  });

  const playlistData = await createResponse.json();
  console.log(`Created playlist: ${playlistData.name}`);
  alert(`Playlist "${playlistName}" created successfully!`);
});
