// Constants
const clientId = 'cb3468700cfa49fda9bdd7af2319dcc5'; // Replace with your actual client ID
const clientSecret = 'f00e4a60cc9b41b8a66c7d97fb2613e4'; // Replace with your actual client secret
const redirectUri = 'https://dwcrate.netlify.app/'; // Replace with your redirect URI
const authUrl = 'https://accounts.spotify.com/authorize';
const tokenUrl = 'https://accounts.spotify.com/api/token';

// Global variables
let accessToken = '';
let refreshToken = '';

// DOM elements
const authButton = document.getElementById('auth-button');
const fetchPlaylistsButton = document.getElementById('fetch-dw-playlists');
const playlistsContainer = document.getElementById('playlists-container');
const createPlaylistButton = document.getElementById('create-playlist');
const authSection = document.getElementById('auth-section');
const playlistSection = document.getElementById('playlist-section');

// Function to handle the Spotify login
function loginToSpotify() {
  const scopes = 'playlist-read-private playlist-modify-public playlist-modify-private user-library-read';
  const authUrlWithParams = `${authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}`;

  window.location = authUrlWithParams;
}

// Function to handle the token exchange and refresh
function exchangeCodeForToken(code) {
  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', redirectUri);
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);

  fetch(tokenUrl, {
    method: 'POST',
    body: params
  })
    .then(response => response.json())
    .then(data => {
      if (data.access_token) {
        accessToken = data.access_token;
        refreshToken = data.refresh_token;
        showAuthenticatedUI();
      } else {
        console.error('Failed to retrieve access token:', data);
      }
    })
    .catch(error => console.error('Error exchanging authorization code:', error));
}

// Function to refresh the access token
function refreshAccessToken() {
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);

  fetch(tokenUrl, {
    method: 'POST',
    body: params
  })
    .then(response => response.json())
    .then(data => {
      if (data.access_token) {
        accessToken = data.access_token;
        console.log('New Access Token:', accessToken);
      } else {
        console.error('Failed to refresh access token:', data);
      }
    })
    .catch(error => console.error('Error refreshing token:', error));
}

// Function to fetch Discover Weekly playlists
function fetchDiscoverWeeklyPlaylists() {
  fetch('https://api.spotify.com/v1/me/playlists', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
    .then(response => response.json())
    .then(data => {
      if (data.items && data.items.length > 0) {
        const dwPlaylists = data.items.filter(playlist => playlist.name.toLowerCase().includes('discover weekly'));
        displayPlaylists(dwPlaylists);
      } else {
        console.log('No Discover Weekly playlists found.');
      }
    })
    .catch(error => console.error('Error fetching playlists:', error));
}

// Function to display playlists
function displayPlaylists(playlists) {
  playlistsContainer.innerHTML = '';

  playlists.forEach(playlist => {
    const playlistDiv = document.createElement('div');
    playlistDiv.classList.add('playlist');
    playlistDiv.innerHTML = `
      <h3>${playlist.name}</h3>
      <button onclick="fetchTracks('${playlist.id}')">Fetch Tracks</button>
    `;
    playlistsContainer.appendChild(playlistDiv);
  });

  createPlaylistButton.classList.remove('hidden');
}

// Function to fetch tracks from a playlist
function fetchTracks(playlistId) {
  fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
    .then(response => response.json())
    .then(data => {
      if (data.items && data.items.length > 0) {
        const tracks = data.items.map(item => item.track.uri);
        console.log('Tracks from playlist:', tracks);
        // Store the tracks to be added to the aggregated playlist
        allTracks.push(...tracks);
      } else {
        console.log('No tracks found in playlist:', playlistId);
      }
    })
    .catch(error => console.error('Error fetching tracks:', error));
}

// Function to create the aggregated playlist
function createAggregatedPlaylist() {
  fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
    .then(response => response.json())
    .then(data => {
      const userId = data.id;
      return fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'DW Crate - Aggregated Discover Weekly',
          description: 'All your Discover Weekly tracks in one playlist!',
          public: false,
        }),
      });
    })
    .then(response => response.json())
    .then(data => {
      const newPlaylistId = data.id;
      return addTracksToPlaylist(newPlaylistId);
    })
    .catch(error => console.error('Error creating aggregated playlist:', error));
}

// Function to add tracks to the playlist
function addTracksToPlaylist(playlistId) {
  fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris: allTracks }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.snapshot_id) {
        console.log('Tracks added to playlist!');
      } else {
        console.error('Error adding tracks to playlist:', data);
      }
    })
    .catch(error => console.error('Error adding tracks to playlist:', error));
}

// Function to show authenticated UI
function showAuthenticatedUI() {
  authSection.classList.add('hidden');
  playlistSection.classList.remove('hidden');
}

// Check if the user is already logged in
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

if (code) {
  // Exchange the code for the token if there's a code in the URL
  exchangeCodeForToken(code);
}

// Event listeners
authButton.addEventListener('click', loginToSpotify);
fetchPlaylistsButton.addEventListener('click', fetchDiscoverWeeklyPlaylists);
createPlaylistButton.addEventListener('click', createAggregatedPlaylist);

